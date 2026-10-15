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
    if (!token) return res.status(200).send('OK');
    await confirmarWebhook(token);
    return res.status(200).send('OK');
  } catch (e) {
    console.error('confirm webhook', e);
    return res.status(200).send('OK');
  }
}
