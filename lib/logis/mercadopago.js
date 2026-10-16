import crypto from 'crypto';
import { FieldValue, getDb } from './db.js';
import { envMercadoPago, urlsMercadoPago } from './env.js';
import { registrarActividadCompra } from './actividad.js';
import { activarPasesVip, entregarCuentas, guardarCompraPrivada, leerDatosCuenta, marcarCompraPagada, quitarPasesDelCarrito, quitarSecretos, refrescarDatosCuenta, registrarVenta, vaciarCarrito } from './entrega.js';
import { idsDeTransaccion, resolverMontoFlow } from './pagos.js';
import { calcularMonto } from './precios.js';
import { descontarStock, eliminarPublicacionesVendidas } from './stock.js';
import { validarCompra, validarEmail } from './validacion.js';

const API = 'https://api.mercadopago.com';

export function pagoMercadoPagoAprobado(pago) {
  return String(pago?.status || '').toLowerCase() === 'approved';
}

export function monedaMercadoPagoValida(pago) {
  const moneda = String(pago?.currency_id || 'CLP').toUpperCase();
  return moneda === 'CLP';
}

export function montoMercadoPagoCoincide(esperado, pagado) {
  const a = Math.round(Number(esperado));
  const b = Math.round(Number(pagado));
  return Number.isFinite(a) && Number.isFinite(b) && a >= 1 && a === b;
}

export function cuerpoPreferenciaMercadoPago({
  total,
  titulo,
  email,
  commerceOrder,
  notificationUrl,
  retorno,
  errorUrl
}) {
  const precio = parseInt(total, 10);
  return {
    items: [{
      title: String(titulo || 'Compra SiilckVentas').slice(0, 256),
      quantity: 1,
      unit_price: precio,
      currency_id: 'CLP'
    }],
    payer: { email: String(email || '') },
    external_reference: String(commerceOrder),
    metadata: { commerceOrder: String(commerceOrder) },
    notification_url: notificationUrl,
    back_urls: {
      success: retorno,
      pending: retorno,
      failure: errorUrl
    },
    auto_return: 'approved',
    statement_descriptor: 'SIILCK'
  };
}

export function urlCheckoutMercadoPago(pref, { sandbox } = {}) {
  if (!pref) return '';
  if (sandbox) return pref.sandbox_init_point || '';
  return pref.init_point || '';
}

export function extraerAvisoMercadoPago(req) {
  const q = req?.query || {};
  let body = req?.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body || '{}'); } catch { body = {}; }
  }
  const topic = String(q.topic || q.type || body.type || body.topic || '').toLowerCase();
  const crudo = q.id || q['data.id'] || (q.data && q.data.id) || body?.data?.id || '';
  return { topic, id: crudo ? String(crudo) : '' };
}

export function esAvisoOrdenMercadoPago(topic) {
  return String(topic || '').includes('merchant_order');
}

export function firmarAvisoMercadoPago({ id, requestId, ts, secret }) {
  const partes = [];
  if (id) partes.push(`id:${id}`);
  if (requestId) partes.push(`request-id:${requestId}`);
  if (ts) partes.push(`ts:${ts}`);
  return crypto.createHmac('sha256', secret).update(`${partes.join(';')};`).digest('hex');
}

export function avisoMercadoPagoValido({ firmaHeader, requestId, id, secret }) {
  if (!secret) return true;
  const texto = String(firmaHeader || '');
  const ts = (texto.match(/(?:^|,)ts=([^,]+)/) || [])[1] || '';
  const v1 = (texto.match(/(?:^|,)v1=([^,]+)/) || [])[1] || '';
  if (!ts || !v1) return false;
  const esperado = firmarAvisoMercadoPago({ id, requestId, ts, secret });
  const a = Buffer.from(esperado);
  const b = Buffer.from(v1);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function tokenMercadoPago() {
  return envMercadoPago().accessToken;
}

async function leerJson(res) {
  const texto = await res.text();
  if (!texto) return {};
  try { return JSON.parse(texto); } catch { return { message: texto.slice(0, 180) }; }
}

async function mpGet(path, token) {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await leerJson(res);
  if (res.status >= 500 || res.status === 429) {
    throw new Error(data.message || 'Mercado Pago no respondió.');
  }
  return { ok: res.ok, status: res.status, data };
}

async function leerPago(id, token) {
  const { ok, data } = await mpGet(`/v1/payments/${encodeURIComponent(id)}`, token);
  if (!ok) return null;
  return data;
}

async function buscarPago(commerceOrder, token) {
  const qs = new URLSearchParams({
    sort: 'date_created',
    criteria: 'desc',
    external_reference: commerceOrder,
    limit: '10'
  });
  const { ok, data } = await mpGet(`/v1/payments/search?${qs}`, token);
  if (!ok) return null;
  const lista = data.results || [];
  return lista.find((p) => pagoMercadoPagoAprobado(p)) || lista[0] || null;
}

async function anotarPago(commerceOrder, pago) {
  if (!commerceOrder || !pago?.id) return;
  const db = getDb();
  const ref = db.collection('ordenes').doc(String(commerceOrder));
  const snap = await ref.get();
  if (!snap.exists) return;
  const orden = snap.data() || {};
  if (orden.estado === 'entregado' || orden.paid === true) return;
  if (orden.mpStatus === 'approved' && !pagoMercadoPagoAprobado(pago)) return;
  await ref.set({
    mpPaymentId: String(pago.id),
    mpStatus: String(pago.status || ''),
    metodoPago: 'mercadopago'
  }, { merge: true });
}

async function entregarOrdenMercadoPago(commerceOrder, pago) {
  const db = getDb();
  const ordenRef = db.collection('ordenes').doc(commerceOrder);
  const entregaRef = db.collection('entregas').doc(commerceOrder);
  const reclamo = await db.runTransaction(async (t) => {
    const ordenSnap = await t.get(ordenRef);
    if (!ordenSnap.exists) return { ok: false, error: `Orden ${commerceOrder} no existe.` };
    const orden = { ...ordenSnap.data(), commerceOrder };
    if (orden.estado === 'entregado') return { ok: true, idempotente: true, commerceOrder, orden };
    if (orden.estado === 'procesando') {
      const entregaSnap = await t.get(entregaRef);
      if (entregaSnap.exists) return { ok: true, idempotente: true, commerceOrder, orden };
      return { ok: true, reintentar: true, commerceOrder, orden };
    }
    const esperado = orden.montos?.total;
    if (!montoMercadoPagoCoincide(esperado, pago.transaction_amount)) {
      return { ok: false, error: 'El monto de Mercado Pago no coincide con la orden.' };
    }
    t.update(ordenRef, {
      estado: 'procesando',
      status: 'processing',
      pagadoEn: FieldValue.serverTimestamp(),
      mpStatus: 'approved',
      mpPaymentId: String(pago.id),
      metodoPago: 'mercadopago'
    });
    return { ok: true, orden };
  });
  if (!reclamo.ok) return reclamo;
  if (reclamo.idempotente) {
    await ordenRef.set({
      paid: true,
      status: 'paid',
      estado: 'entregado',
      mpPaymentId: String(pago.id),
      mpStatus: 'approved',
      metodoPago: 'mercadopago'
    }, { merge: true });
    await marcarCompraPagada(commerceOrder, db);
    return { ok: true, idempotente: true, commerceOrder };
  }

  const orden = reclamo.orden;
  await refrescarDatosCuenta(orden, db);
  const entregas = await entregarCuentas(orden, db);
  await activarPasesVip(orden, db);
  const stock = await descontarStock(orden.items, db);
  await registrarVenta(orden, {
    pago: { medio: 'mercadopago', id: pago.id, status: 'approved', flowOrder: '' },
    entregas,
    stock
  }, db);
  await registrarActividadCompra(orden, db);
  if (orden.origen === 'pase_vip') await quitarPasesDelCarrito(orden.compradorUid, db);
  else await vaciarCarrito(orden.compradorUid, db);
  await ordenRef.update({
    estado: 'entregado',
    status: 'paid',
    paid: true,
    mpPaymentId: String(pago.id),
    mpStatus: 'approved',
    metodoPago: 'mercadopago',
    entregadoEn: FieldValue.serverTimestamp()
  });
  await marcarCompraPagada(commerceOrder, db);
  try {
    await eliminarPublicacionesVendidas(db);
  } catch (e) {
    console.error(JSON.stringify({ evento: 'limpieza_vendidas_error', error: e.message }));
  }
  console.log(JSON.stringify({
    evento: 'mp_orden_pagada',
    commerceOrder,
    mpPaymentId: String(pago.id),
    entregas: entregas.length
  }));
  return { ok: true, commerceOrder, entregas: entregas.length, stock };
}

export async function confirmarPagoMercadoPago({ paymentId, commerceOrder } = {}) {
  const token = tokenMercadoPago();
  if (!token) throw new Error('Falta MERCADOPAGO_ACCESS_TOKEN en las variables de entorno.');
  let pago = null;
  if (paymentId) pago = await leerPago(paymentId, token);
  else if (commerceOrder) pago = await buscarPago(commerceOrder, token);
  if (!pago) return { ok: true, pendiente: true, commerceOrder: commerceOrder || '', status: '' };
  const ordenId = String(pago.external_reference || commerceOrder || '');
  if (ordenId) await anotarPago(ordenId, pago);
  if (!pagoMercadoPagoAprobado(pago)) {
    return { ok: true, pendiente: true, status: pago.status || '', commerceOrder: ordenId };
  }
  if (!monedaMercadoPagoValida(pago)) return { ok: false, error: 'La moneda del pago no es CLP.' };
  if (!ordenId) return { ok: false, error: 'Mercado Pago no envió la orden.' };
  if (commerceOrder && String(commerceOrder) !== ordenId) {
    return { ok: false, error: 'La orden no coincide con el pago.' };
  }
  return entregarOrdenMercadoPago(ordenId, pago);
}

export async function confirmarOrdenComercioMercadoPago(orderId) {
  const token = tokenMercadoPago();
  if (!token) throw new Error('Falta MERCADOPAGO_ACCESS_TOKEN en las variables de entorno.');
  const { ok, data } = await mpGet(`/merchant_orders/${encodeURIComponent(orderId)}`, token);
  if (!ok) return { ok: true, pendiente: true };
  const pagos = data.payments || [];
  if (!pagos.length) return { ok: true, pendiente: true, commerceOrder: data.external_reference || '' };
  let ultimo = { ok: true, pendiente: true, commerceOrder: data.external_reference || '' };
  for (const pago of pagos) {
    if (!pago?.id) continue;
    ultimo = await confirmarPagoMercadoPago({
      paymentId: pago.id,
      commerceOrder: data.external_reference || ''
    });
  }
  return ultimo;
}

export async function crearPagoMercadoPago({ uid, email, idToken, tipoVipPase, siteUrl, listingId }) {
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

  const total = resolverMontoFlow(montos);
  if (!total || total < 1) {
    return { ok: false, error: compraVipDirecta
      ? 'El Pase VIP no tiene un precio válido para cobrar.'
      : 'El carrito no tiene un total válido para pagar.' };
  }
  const emailPago = (compra && compra.ok && compra.email) || (mail.ok && mail.emailOriginal) || email;
  if (!emailPago) return { ok: false, error: 'Falta el email del comprador.' };

  const mp = envMercadoPago();
  if (!mp.accessToken) {
    return { ok: false, error: 'Falta MERCADOPAGO_ACCESS_TOKEN en las variables de entorno.' };
  }

  const commerceOrder = `SIIILCK-${(compra?.uid || uid || 'inv').toString().slice(0, 8)}-${Date.now()}`;
  const urls = urlsMercadoPago(siteUrl);
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
      metodoPago: 'mercadopago',
      creadoEn: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp()
    });
    await guardarCompraPrivada(commerceOrder, { compradorUid, datosCuenta }, db);
  } catch (e) {
    console.error(JSON.stringify({ evento: 'orden_no_creada', commerceOrder, error: e.message }));
    return { ok: false, error: 'No se pudo crear la orden. No se abrió el cobro.' };
  }

  const titulo = compraVipDirecta ? 'Pase VIP SiilckVentas' : (itemsLimpios[0]?.titulo || 'Compra SiilckVentas');
  const cuerpo = cuerpoPreferenciaMercadoPago({
    total,
    titulo,
    email: emailPago,
    commerceOrder,
    notificationUrl: urls.notificationUrl,
    retorno: urls.retorno,
    errorUrl: urls.error
  });
  const res = await fetch(`${API}/checkout/preferences`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${mp.accessToken}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': commerceOrder
    },
    body: JSON.stringify(cuerpo)
  });
  const pref = await leerJson(res);
  const url = urlCheckoutMercadoPago(pref, { sandbox: mp.sandbox });
  if (!res.ok || !url) {
    return { ok: false, error: pref.message || pref.error || 'Mercado Pago no devolvió el link de pago.' };
  }
  try {
    await db.collection('ordenes').doc(commerceOrder).set({
      mpPreferenceId: pref.id || '',
      metodoPago: 'mercadopago'
    }, { merge: true });
  } catch (e) {
    console.error(JSON.stringify({ evento: 'mp_preferencia_no_guardada', commerceOrder, error: e.message }));
  }
  console.log(JSON.stringify({
    evento: 'mp_pago_creado',
    commerceOrder,
    total,
    retorno: urls.retorno,
    cuentasCopiadas: datosCuenta.length
  }));
  return {
    ok: true,
    commerceOrder,
    total,
    amount: total,
    url,
    preferenceId: pref.id || ''
  };
}
