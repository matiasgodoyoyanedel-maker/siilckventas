import { getDb } from '../lib/logis/db.js';
import { copiarMapaEnPublicaciones, leerMapaReputacion } from '../lib/logis/ficha.js';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

let cache = { en: 0, data: null };
const TTL_MS = 20000;

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Usa GET' });
  try {
    if (cache.data && Date.now() - cache.en < TTL_MS) return res.status(200).json(cache.data);
    const db = getDb();
    const data = await leerMapaReputacion(db);
    cache = { en: Date.now(), data };
    try {
      await copiarMapaEnPublicaciones(db, data.vendedores);
    } catch (e) {
      console.error(JSON.stringify({ evento: 'reputacion_copia_error', error: e.message }));
    }
    return res.status(200).json(data);
  } catch (e) {
    console.error(JSON.stringify({ evento: 'reputacion_error', error: e.message }));
    return res.status(500).json({ ok: false, error: 'No se pudo cargar la reputación.' });
  }
}
