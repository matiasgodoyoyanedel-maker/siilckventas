import { leerFicha } from '../lib/logis/ficha.js';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function idDe(req) {
  if (req.query && req.query.id) return String(req.query.id);
  try {
    return new URL(req.url || '', 'http://local').searchParams.get('id') || '';
  } catch {
    return '';
  }
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Usa GET' });
  try {
    const data = await leerFicha(idDe(req));
    if (!data.ok) return res.status(404).json(data);
    return res.status(200).json(data);
  } catch (e) {
    console.error(JSON.stringify({ evento: 'ficha_error', error: e.message }));
    return res.status(500).json({ ok: false, error: 'No se pudo cargar la ficha.' });
  }
}
