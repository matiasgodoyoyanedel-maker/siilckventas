import { confirmarWebhook, extraerTokenFlow } from '../lib/logis/pagos.js';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const token = extraerTokenFlow(req);
    console.log(JSON.stringify({ evento: 'flow_webhook_recibido', metodo: req.method, tieneToken: !!token }));
    if (!token) return res.status(200).send('OK');
    const resultado = await confirmarWebhook(token);
    console.log(JSON.stringify({
      evento: 'flow_webhook_resultado',
      ok: !!resultado?.ok,
      commerceOrder: resultado?.commerceOrder || '',
      status: resultado?.status ?? '',
      pendiente: !!resultado?.pendiente,
      entregas: resultado?.entregas ?? ''
    }));
    return res.status(200).send('OK');
  } catch (e) {
    console.error(JSON.stringify({ evento: 'flow_webhook_error', error: e.message }));
    return res.status(200).send('OK');
  }
}
