import crypto from 'crypto';
import { FieldValue, getDb } from './db.js';
import { envFlow } from './env.js';
import { activarPasesVip, entregarCuentas, quitarPasesDelCarrito, registrarVenta, vaciarCarrito } from './entrega.js';
import { calcularMonto } from './precios.js';
import { descontarStock } from './stock.js';
import { validarCompra, validarEmail } from './validacion.js';

function flowBase() {
  return envFlow().sandbox
    ? 'https://sandbox.flow.cl/api'
    : 'https://www.flow.cl/api';
}

function credencialesFlow() {
  const { apiKey, secretKey } = envFlow();
  if (!apiKey || !secretKey) {
    throw new Error('Faltan FLOW_API_KEY o FLOW_SECRET_KEY en las variables de entorno.');
  }
  return { apiKey, secretKey };
}

export function firmarFlow(params, secretKey) {
  let toSign = '';
  Object.keys(params).sort().forEach((k) => { toSign += k + params[k]; });
  return crypto.createHmac('sha256', secretKey).update(toSign).digest('hex');
}

async function llamarFlow(path, params, method = 'POST') {
  const { apiKey, secretKey } = credencialesFlow();
  const payload = { ...params, apiKey };
  const signature = firmarFlow(payload, secretKey);
  const qs = new URLSearchParams({ ...payload, s: signature });
  const url = method === 'GET' ? `${flowBase()}${path}?${qs}` : `${flowBase()}${path}`;
  const res = await fetch(url, method === 'GET' ? { method: 'GET' } : {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: qs.toString()
  });
  const data = await res.json();
  if (!res.ok && data?.code) return data;
  return data;
}

function urlsSitio() {
  const env = envFlow();
  return {
    urlConfirmation: env.urlConfirmation,
    urlReturn: env.urlReturn
  };
}

export async function crearPagoDesdeCarrito({ uid, email, idToken, amount, tipoVipPase }) {
  const mail = validarEmail(email);
  const compraVipDirecta = tipoVipPase === 'basico' || tipoVipPase === 'pro';
  let compra = null;
  let montos = null;

  try {
    compra = await validarCompra({
      uid,
      email,
      idToken,
      tipoVipPase: compraVipDirecta ? tipoVipPase : undefined
    });
    if (compra.ok) {
      montos = calcularMonto({ items: compra.items, perfil: compra.perfil });
    } else if (compraVipDirecta || !parseInt(amount, 10)) {
      return compra;
    }
  } catch (e) {
    if (compraVipDirecta || !parseInt(amount, 10)) {
      return { ok: false, error: e.message };
    }
  }

  const totalCarrito = parseInt(amount, 10) || 0;
  const total = (montos && montos.ok) ? montos.total : (compraVipDirecta ? 0 : totalCarrito);
  if (!total || total < 1) {
    return { ok: false, error: compraVipDirecta
      ? 'El Pase VIP no tiene un precio válido en la configuración.'
      : 'El carrito no tiene un total válido para pagar.' };
  }

  const emailPago = (compra && compra.ok && compra.email) || (mail.ok && mail.emailOriginal) || email;
  if (!emailPago) return { ok: false, error: 'Falta el email del comprador.' };

  const commerceOrder = `SIIILCK-${(compra?.uid || uid || 'inv').toString().slice(0, 8)}-${Date.now()}`;
  const env = envFlow();
  const { urlConfirmation } = urlsSitio();
  const urlReturn = compraVipDirecta
    ? `${env.siteUrl}/index.html?ok=1&vip=1&tipo=${tipoVipPase}`
    : urlsSitio().urlReturn;

  const flow = await llamarFlow('/payment/create', {
    commerceOrder,
    subject: compraVipDirecta ? 'Pase VIP SiilckVentas' : 'Compra SiilckVentas',
    currency: 'CLP',
    amount: String(parseInt(total, 10)),
    email: emailPago,
    urlConfirmation,
    urlReturn
  });

  if (!flow?.url || !flow?.token) {
    return { ok: false, error: flow?.message || 'Flow no devolvió URL de pago.', flow };
  }

  try {
    const db = getDb();
    await db.collection('ordenes').doc(commerceOrder).set({
      commerceOrder,
      compradorUid: compra?.uid || uid || '',
      email: emailPago,
      items: compra?.items || [],
      montos: montos && montos.ok ? montos : { total, currency: 'CLP', origen: compraVipDirecta ? 'pase_vip' : 'carrito' },
      origen: compra?.origen || (compraVipDirecta ? 'pase_vip' : 'carrito'),
      estado: 'pendiente',
      flowToken: flow.token,
      creadoEn: FieldValue.serverTimestamp()
    });
  } catch (e) {
    console.error('orden no guardada (falta Firebase Admin):', e.message);
  }

  return {
    ok: true,
    commerceOrder,
    total,
    flowUrl: `${flow.url}?token=${flow.token}`,
    token: flow.token
  };
}

export async function consultarEstadoFlow(token) {
  if (!token) throw new Error('Falta el token de Flow.');
  return llamarFlow('/payment/getStatus', { token }, 'GET');
}

export function extraerTokenFlow(req) {
  if (!req) return '';
  if (req.query?.token) return String(req.query.token);
  const body = req.body;
  if (!body) return '';
  if (typeof body === 'string') return new URLSearchParams(body).get('token') || '';
  if (body.token) return String(body.token);
  return '';
}

export async function confirmarWebhook(token) {
  const pago = await consultarEstadoFlow(token);
  const status = Number(pago?.status);
  if (status !== 2) {
    return { ok: true, pendiente: true, status, pago };
  }

  const commerceOrder = pago.commerceOrder;
  if (!commerceOrder) return { ok: false, error: 'Flow no envió commerceOrder.' };

  const db = getDb();
  const ordenRef = db.collection('ordenes').doc(commerceOrder);
  const reclamo = await db.runTransaction(async (t) => {
    const ordenSnap = await t.get(ordenRef);
    if (!ordenSnap.exists) return { ok: false, error: `Orden ${commerceOrder} no existe.` };
    const orden = { ...ordenSnap.data(), commerceOrder };
    if (orden.estado === 'entregado' || orden.estado === 'procesando') {
      return { ok: true, idempotente: true, commerceOrder, orden };
    }
    t.update(ordenRef, { estado: 'procesando', pagadoEn: FieldValue.serverTimestamp(), flowStatus: status });
    return { ok: true, orden };
  });
  if (!reclamo.ok) return reclamo;
  if (reclamo.idempotente) {
    return { ok: true, idempotente: true, commerceOrder };
  }
  const orden = reclamo.orden;

  const entregas = await entregarCuentas(orden, db);
  await activarPasesVip(orden, db);
  const stock = await descontarStock(orden.items, db);
  await registrarVenta(orden, { pago: { ...pago, token }, entregas, stock }, db);
  if (orden.origen === 'pase_vip') {
    await quitarPasesDelCarrito(orden.compradorUid, db);
  } else {
    await vaciarCarrito(orden.compradorUid, db);
  }
  await ordenRef.update({ estado: 'entregado', entregadoEn: FieldValue.serverTimestamp() });

  return { ok: true, commerceOrder, entregas: entregas.length, stock };
}
