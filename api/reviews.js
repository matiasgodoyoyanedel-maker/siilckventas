import { FieldValue, getDb } from '../lib/logis/db.js';
import { estaPagada } from '../lib/logis/entrega.js';
import { validarCalificacion } from '../lib/logis/reviews.js';
import { verificarTokenSesion } from '../lib/logis/sesion.js';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function tokenDe(req, body) {
  const header = req.headers?.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return body?.idToken || '';
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Usa GET o POST' });
  }

  try {
    let body = req.body || {};
    if (typeof body === 'string') {
      try { body = JSON.parse(body || '{}'); } catch { body = {}; }
    }
    const sesion = await verificarTokenSesion(tokenDe(req, body));
    if (!sesion.ok) return res.status(401).json({ ok: false, error: sesion.error });

    const orderId = String((req.method === 'GET' ? req.query?.order_id : body.order_id) || '').trim();
    if (!orderId) return res.status(400).json({ ok: false, error: 'Falta la compra.' });

    const db = getDb();
    const ordenSnap = await db.collection('ordenes').doc(orderId).get();
    if (!ordenSnap.exists) return res.status(404).json({ ok: false, error: 'No encontramos esa compra.' });
    const orden = ordenSnap.data() || {};
    const buyerId = orden.compradorUid || orden.buyer_id || '';
    if (buyerId !== sesion.uid) {
      return res.status(403).json({ ok: false, error: 'Esta compra no pertenece a tu cuenta.' });
    }

    const reviewRef = db.collection('reviews').doc(orderId);
    const previa = await reviewRef.get();

    if (req.method === 'GET') {
      if (!previa.exists) return res.status(200).json({ ok: true, review: null });
      const data = previa.data() || {};
      return res.status(200).json({
        ok: true,
        review: {
          order_id: orderId,
          rating: data.rating,
          comment: data.comment || '',
          created_at: data.created_at || null
        }
      });
    }

    if (!estaPagada(orden)) {
      return res.status(400).json({ ok: false, error: 'Solo puedes calificar una compra pagada.' });
    }
    if (previa.exists) {
      return res.status(400).json({ ok: false, error: 'Ya calificaste esta compra' });
    }

    const calificacion = validarCalificacion({
      orderId,
      rating: body.rating,
      comment: body.comment
    });
    if (!calificacion.ok) return res.status(400).json(calificacion);

    const item = (orden.items || []).find((linea) => linea && linea.publicacionId) || {};
    try {
      await reviewRef.create({
        id: orderId,
        order_id: orderId,
        buyer_id: sesion.uid,
        seller_id: orden.seller_id || item.vendedorUid || '',
        listing_id: orden.listing_id || item.publicacionId || '',
        rating: calificacion.rating,
        comment: calificacion.comment,
        created_at: FieldValue.serverTimestamp()
      });
    } catch (e) {
      if (e.code === 6 || e.code === 'already-exists' || /already exists/i.test(e.message || '')) {
        return res.status(400).json({ ok: false, error: 'Ya calificaste esta compra' });
      }
      throw e;
    }

    return res.status(200).json({
      ok: true,
      review: { order_id: orderId, rating: calificacion.rating, comment: calificacion.comment }
    });
  } catch (e) {
    console.error(JSON.stringify({ evento: 'review_error', error: e.message }));
    return res.status(500).json({ ok: false, error: 'No se pudo guardar la calificación.' });
  }
}
