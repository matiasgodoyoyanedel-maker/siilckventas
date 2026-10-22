import { urlSitioDesdeRequest } from '../lib/logis/env.js';
import { crearPagoDesdeCarrito } from '../lib/logis/pagos.js';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Usa POST' });

  try {
    let body = req.body || {};
    if (typeof body === 'string') {
      try { body = JSON.parse(body || '{}'); } catch { body = {}; }
    }
    const authHeader = req.headers?.authorization || '';
    const idToken = body.idToken || (authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '');
    if (!idToken) {
      return res.status(401).json({ error: 'Debes iniciar sesión para comprar.' });
    }
    const resultado = await crearPagoDesdeCarrito({
      uid: body.uid,
      email: body.email,
      idToken,
      tipoVipPase: body.tipoVipPase,
      listingId: body.listingId || body.listing_id || '',
      siteUrl: urlSitioDesdeRequest(req)
    });
    if (!resultado.ok) return res.status(400).json(resultado);
    return res.status(200).json({
      url: resultado.url,
      flowUrl: resultado.flowUrl,
      commerceOrder: resultado.commerceOrder,
      amount: resultado.amount,
      total: resultado.total
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
