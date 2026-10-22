import { urlSitioDesdeRequest } from '../../lib/logis/env.js';
import { crearPagoDesdeCarrito } from '../../lib/logis/pagos.js';

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
    const listingId = body.listingId || body.listing_id || '';
    const email = body.email || '';
    const tipoVipPase = body.tipoVipPase === 'pro' || body.tipoVipPase === 'basico' ? body.tipoVipPase : '';
    const authHeader = req.headers?.authorization || '';
    const idToken = body.idToken || (authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '');
    if (!idToken) {
      return res.status(401).json({ error: 'Debes iniciar sesión para comprar.' });
    }
    if (!email || (!listingId && !tipoVipPase)) {
      return res.status(400).json({ error: 'Falta listingId o email' });
    }
    const resultado = await crearPagoDesdeCarrito({
      uid: body.uid,
      email,
      idToken,
      tipoVipPase,
      listingId,
      siteUrl: urlSitioDesdeRequest(req)
    });
    if (!resultado.ok) {
      const status = /no encontrada/i.test(resultado.error || '') ? 404 : 400;
      return res.status(status).json({ error: resultado.error || 'No se pudo preparar la compra.' });
    }
    return res.status(200).json({
      url: resultado.url,
      amount: resultado.amount,
      order_id: resultado.commerceOrder
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
