import { leerVendedor } from '../lib/logis/ventas-reales.js';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function uidDe(req) {
  if (req.query && (req.query.uid || req.query.id)) return String(req.query.uid || req.query.id);
  try {
    return new URL(req.url || '', 'http://local').searchParams.get('uid') || '';
  } catch {
    return '';
  }
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Usa GET' });
  try {
    const data = await leerVendedor(uidDe(req));
    if (!data.ok) return res.status(404).json(data);
    return res.status(200).json(data);
  } catch (e) {
    console.error(JSON.stringify({ evento: 'vendedor_error', error: e.message }));
    return res.status(500).json({ ok: false, error: 'No se pudo cargar el vendedor.' });
  }
}
