import crypto from 'crypto';
import { FieldValue, getDb } from './db.js';
import { entregarCuentas, registrarVenta, vaciarCarrito } from './entrega.js';
import { calcularMonto } from './precios.js';
import { descontarStock } from './stock.js';
import { validarCompra, validarEmail } from './validacion.js';

function flowBase() {
  return process.env.FLOW_SANDBOX === 'true'
    ? 'https://sandbox.flow.cl/api'
    : 'https://www.flow.cl/api';
}

function credencialesFlow() {
  const apiKey = process.env.FLOW_API_KEY;
  const secretKey = process.env.FLOW_SECRET_KEY;
  if (!apiKey || !secretKey) throw new Error('Faltan FLOW_API_KEY o FLOW_SECRET_KEY.');
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
  const site = (process.env.SITE_URL || 'https://siilckventas.vercel.app').replace(/\/$/, '');
  return {
    urlConfirmation: process.env.FLOW_URL_CONFIRMATION || `${site}/api/confirm`,
    urlReturn: process.env.FLOW_URL_RETURN || `${site}/carrito.html?ok=1`
  };
}

export async function crearPagoDesdeCarrito({ uid, email, idToken, amount }) {
  const mail = validarEmail(email);
  let compra = null;
  let montos = null;

  try {
    compra = await validarCompra({ uid, email, idToken });
    if (compra.ok) {
      montos = calcularMonto({ items: compra.items, perfil: compra.perfil });
    } else if (!parseInt(amount, 10)) {
      return compra;
    }
  } catch (e) {
    if (!parseInt(amount, 10)) {
      return { ok: false, error: e.message };
    }
  }

  const totalCarrito = parseInt(amount, 10) || 0;
  const total = (montos && montos.ok) ? montos.total : totalCarrito;
  if (!total || total < 1) {
    return { ok: false, error: 'El carrito no tiene un total válido para pagar.' };
  }

  const emailPago = (compra && compra.ok && compra.email) || (mail.ok && mail.emailOriginal) || email;
  if (!emailPago) return { ok: false, error: 'Falta el email del comprador.' };

  const commerceOrder = `SIIILCK-${(compra?.uid || uid || 'inv').toString().slice(0, 8)}-${Date.now()}`;
  const { urlConfirmation, urlReturn } = urlsSitio();

  const flow = await llamarFlow('/payment/create', {
    commerceOrder,
    subject: 'Compra SiilckVentas',
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
      montos: montos && montos.ok ? montos : { total, currency: 'CLP', origen: 'carrito' },
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
  const stock = await descontarStock(orden.items, db);
  await registrarVenta(orden, { pago: { ...pago, token }, entregas, stock }, db);
  await vaciarCarrito(orden.compradorUid, db);
  await ordenRef.update({ estado: 'entregado', entregadoEn: FieldValue.serverTimestamp() });

  return { ok: true, commerceOrder, entregas: entregas.length, stock };
}
