import { consultarEstadoFlow, confirmarWebhook, extraerTokenFlow } from '../lib/logis/pagos.js';

function redirigir(res, ruta) {
  res.writeHead(303, { Location: ruta });
  res.end();
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = extraerTokenFlow(req);
  console.log(JSON.stringify({ evento: 'flow_retorno', metodo: req.method, tieneToken: !!token }));
  if (!token) return redirigir(res, '/pago/error');

  try {
    const pago = await consultarEstadoFlow(token);
    const status = Number(pago?.status);
    const orderId = pago?.commerceOrder ? String(pago.commerceOrder) : '';
    console.log(JSON.stringify({
      evento: 'flow_retorno_estado',
      status: pago?.status,
      commerceOrder: orderId,
      flowOrder: pago?.flowOrder || ''
    }));

    if (!orderId || status === 3 || status === 4) {
      const qs = orderId ? `?order_id=${encodeURIComponent(orderId)}` : '';
      return redirigir(res, `/pago/error${qs}`);
    }

    if (status === 2) {
      try {
        await confirmarWebhook(token);
      } catch (e) {
        console.error(JSON.stringify({ evento: 'flow_retorno_confirm_error', commerceOrder: orderId, error: e.message }));
      }
    }

    return redirigir(res, `/pago/exito?order_id=${encodeURIComponent(orderId)}`);
  } catch (e) {
    console.error(JSON.stringify({ evento: 'flow_retorno_error', error: e.message }));
    return redirigir(res, '/pago/error');
  }
}
