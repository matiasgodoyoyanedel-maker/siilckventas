import crypto from 'crypto';
import { FieldValue, getDb } from './db.js';
import { envFlow, urlsDePago } from './env.js';
import { registrarActividadCompra } from './actividad.js';
import { activarPasesVip, entregarCuentas, guardarCompraPrivada, leerDatosCuenta, marcarCompraPagada, quitarPasesDelCarrito, quitarSecretos, refrescarDatosCuenta, registrarVenta, vaciarCarrito } from './entrega.js';
import { calcularMonto } from './precios.js';
import { descontarStock, eliminarPublicacionesVendidas } from './stock.js';
import { guardarOrdenPagada } from './orders.js';
import { validarCompra, validarEmail } from './validacion.js';

async function registrarEnOrders(commerceOrder, metodo) {
  try {
    await guardarOrdenPagada(commerceOrder, metodo);
  } catch (e) {
    console.error(JSON.stringify({ evento: 'orders_no_guardada', commerceOrder, metodo, error: e.message }));
  }
}

export function idsDeTransaccion(commerceOrder, flowOrder) {
  const interno = String(commerceOrder || '');
  const flow = flowOrder ? String(flowOrder) : '';
  return {
    id: interno,
    transactionId: interno,
    flowOrder: flow || null,
    flowTransactionId: flow || interno
  };
}

export function resolverMontoFlow(montos) {
  if (montos && montos.ok && Number(montos.total) > 0) return parseInt(montos.total, 10);
  return 0;
}

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

export async function crearPagoDesdeCarrito({ uid, email, idToken, tipoVipPase, siteUrl, listingId }) {
  const mail = validarEmail(email);
  const compraVipDirecta = tipoVipPase === 'basico' || tipoVipPase === 'pro';
  let compra = null;
  let montos = null;

  try {
    compra = await validarCompra({
      uid,
      email,
      idToken,
      tipoVipPase: compraVipDirecta ? tipoVipPase : undefined,
      listingId: compraVipDirecta ? '' : listingId
    });
    if (!compra.ok) return compra;
    montos = calcularMonto({ items: compra.items, perfil: compra.perfil });
    if (!montos.ok) return montos;
  } catch (e) {
    return { ok: false, error: e.message || 'No se pudo preparar la compra.' };
  }

  if (!compra?.ok || !compra.items?.length) {
    return compra?.error ? compra : { ok: false, error: 'No se pudo preparar la compra.' };
  }

  const total = resolverMontoFlow(montos);
  if (!total || total < 1) {
    return { ok: false, error: compraVipDirecta
      ? 'El Pase VIP no tiene un precio válido para cobrar en Flow.'
      : 'El carrito no tiene un total válido para pagar.' };
  }

  const emailPago = (compra && compra.ok && compra.email) || (mail.ok && mail.emailOriginal) || email;
  if (!emailPago) return { ok: false, error: 'Falta el email del comprador.' };

  const commerceOrder = `SIIILCK-${(compra?.uid || uid || 'inv').toString().slice(0, 8)}-${Date.now()}`;
  const urls = urlsDePago(siteUrl);
  const urlConfirmation = urls.urlConfirmation;
  const urlReturn = urls.urlReturn;
  const compradorUid = compra?.uid || uid || '';
  const itemsLimpios = (compra?.items || []).map(quitarSecretos);
  const db = getDb();
  let datosCuenta = [];
  try {
    datosCuenta = await leerDatosCuenta(itemsLimpios, db);
    const primera = datosCuenta[0] || itemsLimpios.find((item) => item.publicacionId) || {};
    const idsOrden = idsDeTransaccion(commerceOrder);
    await db.collection('ordenes').doc(commerceOrder).set({
      commerceOrder,
      id: idsOrden.id,
      publicacionId: primera.publicacionId || '',
      compradorUid,
      buyer_id: compradorUid,
      vendedorUid: primera.vendedorUid || '',
      seller_id: primera.vendedorUid || '',
      listing_id: primera.publicacionId || '',
      transactionId: idsOrden.transactionId,
      email: emailPago,
      items: itemsLimpios,
      montos: montos && montos.ok ? montos : { total, currency: 'CLP', origen: compraVipDirecta ? 'pase_vip' : 'carrito' },
      origen: compra?.origen || (compraVipDirecta ? 'pase_vip' : 'carrito'),
      estado: 'pendiente',
      status: 'pending',
      paid: false,
      flowToken: '',
      creadoEn: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp()
    });
    await guardarCompraPrivada(commerceOrder, { compradorUid, datosCuenta }, db);
  } catch (e) {
    console.error(JSON.stringify({ evento: 'orden_no_creada', commerceOrder, error: e.message }));
    return { ok: false, error: 'No se pudo crear la orden. No se abrió el cobro.' };
  }

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
    const idsFlow = idsDeTransaccion(commerceOrder, flow.flowOrder);
    const patchFlow = { flowToken: flow.token, flowTransactionId: idsFlow.flowTransactionId };
    if (idsFlow.flowOrder) patchFlow.flowOrder = idsFlow.flowOrder;
    await db.collection('ordenes').doc(commerceOrder).set(patchFlow, { merge: true });
  } catch (e) {
    console.error(JSON.stringify({ evento: 'flow_token_no_guardado', commerceOrder, error: e.message }));
  }
  console.log(JSON.stringify({
    evento: 'flow_pago_creado',
    commerceOrder,
    total,
    urlReturn,
    urlConfirmation,
    cuentasCopiadas: datosCuenta.length
  }));

  const url = `${flow.url}?token=${flow.token}`;
  return {
    ok: true,
    commerceOrder,
    total,
    amount: total,
    flowUrl: url,
    url,
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
  console.log(JSON.stringify({
    evento: 'flow_confirmacion',
    commerceOrder: pago?.commerceOrder || '',
    status: pago?.status,
    flowOrder: pago?.flowOrder || ''
  }));
  if (pago?.commerceOrder && pago?.flowOrder) {
    try {
      const idsPendiente = idsDeTransaccion(pago.commerceOrder, pago.flowOrder);
      await getDb().collection('ordenes').doc(String(pago.commerceOrder)).set({
        flowOrder: idsPendiente.flowOrder,
        flowTransactionId: idsPendiente.flowTransactionId
      }, { merge: true });
    } catch (e) {
      console.error(JSON.stringify({ evento: 'flow_id_no_guardado', error: e.message }));
    }
  }
  if (status !== 2) {
    return { ok: true, pendiente: true, status, commerceOrder: pago?.commerceOrder || '', pago };
  }

  const commerceOrder = pago.commerceOrder;
  if (!commerceOrder) return { ok: false, error: 'Flow no envió commerceOrder.' };

  const db = getDb();
  const ordenRef = db.collection('ordenes').doc(commerceOrder);
  const entregaRef = db.collection('entregas').doc(commerceOrder);
  const reclamo = await db.runTransaction(async (t) => {
    const ordenSnap = await t.get(ordenRef);
    if (!ordenSnap.exists) return { ok: false, error: `Orden ${commerceOrder} no existe.` };
    const orden = { ...ordenSnap.data(), commerceOrder };
    if (orden.estado === 'entregado') {
      return { ok: true, idempotente: true, commerceOrder, orden };
    }
    if (orden.estado === 'procesando') {
      const entregaSnap = await t.get(entregaRef);
      if (entregaSnap.exists) return { ok: true, idempotente: true, commerceOrder, orden };
      return { ok: true, reintentar: true, commerceOrder, orden };
    }
    t.update(ordenRef, { estado: 'procesando', status: 'processing', pagadoEn: FieldValue.serverTimestamp(), flowStatus: status });
    return { ok: true, orden };
  });
  if (!reclamo.ok) return reclamo;
  if (reclamo.idempotente) {
    const idsPagados = idsDeTransaccion(commerceOrder, pago.flowOrder);
    const patchPagado = {
      paid: true,
      status: 'paid',
      estado: 'entregado',
      flowTransactionId: idsPagados.flowTransactionId
    };
    if (idsPagados.flowOrder) patchPagado.flowOrder = idsPagados.flowOrder;
    await ordenRef.set(patchPagado, { merge: true });
    await marcarCompraPagada(commerceOrder, db);
    await registrarEnOrders(commerceOrder, 'flow');
    return { ok: true, idempotente: true, commerceOrder };
  }
  const orden = reclamo.orden;

  await refrescarDatosCuenta(orden, db);
  const entregas = await entregarCuentas(orden, db);
  await activarPasesVip(orden, db);
  const stock = await descontarStock(orden.items, db);
  await registrarVenta(orden, { pago: { ...pago, token }, entregas, stock }, db);
  await registrarActividadCompra(orden, db);
  if (orden.origen === 'pase_vip') {
    await quitarPasesDelCarrito(orden.compradorUid, db);
  } else {
    await vaciarCarrito(orden.compradorUid, db);
  }
  const idsEntrega = idsDeTransaccion(commerceOrder, pago.flowOrder);
  const patchEntrega = {
    estado: 'entregado',
    status: 'paid',
    paid: true,
    flowTransactionId: idsEntrega.flowTransactionId,
    entregadoEn: FieldValue.serverTimestamp()
  };
  if (idsEntrega.flowOrder) patchEntrega.flowOrder = idsEntrega.flowOrder;
  await ordenRef.update(patchEntrega);
  await marcarCompraPagada(commerceOrder, db);
  try {
    await eliminarPublicacionesVendidas(db);
  } catch (e) {
    console.error(JSON.stringify({ evento: 'limpieza_vendidas_error', error: e.message }));
  }
  console.log(JSON.stringify({
    evento: 'flow_orden_pagada',
    commerceOrder,
    entregas: entregas.length
  }));

  await registrarEnOrders(commerceOrder, 'flow');
  return { ok: true, commerceOrder, entregas: entregas.length, stock };
}
