import { solicitarRetiro } from '../lib/logis/saldo.js';
import { verificarTokenSesion } from '../lib/logis/sesion.js';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Usa POST' });
  const header = req.headers?.authorization || '';
  const idToken = header.startsWith('Bearer ') ? header.slice(7) : '';
  const sesion = await verificarTokenSesion(idToken);
  if (!sesion.ok) return res.status(401).json({ ok: false, error: sesion.error || 'Inicia sesión.' });
  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body || '{}'); } catch { body = {}; }
  }
  try {
    const data = await solicitarRetiro({ uid: sesion.uid, monto: body.monto, destino: body.destino });
    if (!data.ok) return res.status(400).json(data);
    return res.status(200).json(data);
  } catch (e) {
    console.error(JSON.stringify({ evento: 'retiro_error', error: e.message }));
    return res.status(500).json({ ok: false, error: 'No se pudo pedir el retiro.' });
  }
}
