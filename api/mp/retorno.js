import { confirmarPagoMercadoPago } from '../../lib/logis/mercadopago.js';

function redirigir(res, ruta) {
  res.writeHead(303, { Location: ruta });
  res.end();
}

function leer(req) {
  const q = req.query || {};
  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = Object.fromEntries(new URLSearchParams(body)); } catch { body = {}; }
  }
  const paymentId = q.payment_id || q.collection_id || body.payment_id || body.collection_id || '';
  const status = String(q.status || q.collection_status || body.status || body.collection_status || '').toLowerCase();
  const orderId = String(q.external_reference || body.external_reference || '');
  return { paymentId: paymentId ? String(paymentId) : '', status, orderId };
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { paymentId, status, orderId } = leer(req);
  console.log(JSON.stringify({
    evento: 'mp_retorno',
    status,
    commerceOrder: orderId,
    tienePago: !!paymentId
  }));
  if (!orderId && !paymentId) return redirigir(res, '/pago/error');
  if (status === 'rejected' || status === 'cancelled' || status === 'null') {
    const qs = orderId ? `?order_id=${encodeURIComponent(orderId)}` : '';
    return redirigir(res, `/pago/error${qs}`);
  }
  if (status === 'approved' && paymentId) {
    try {
      await confirmarPagoMercadoPago({ paymentId, commerceOrder: orderId });
    } catch (e) {
      console.error(JSON.stringify({ evento: 'mp_retorno_confirm_error', commerceOrder: orderId, error: e.message }));
    }
  }
  if (!orderId) return redirigir(res, '/pago/error');
  return redirigir(res, `/pago/exito?order_id=${encodeURIComponent(orderId)}`);
}
