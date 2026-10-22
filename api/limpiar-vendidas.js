import { eliminarPublicacionesVendidas } from '../lib/logis/stock.js';

function cronAutorizado(req) {
  const secret = process.env.CRON_SECRET || '';
  const authz = String(req.headers?.authorization || '');
  if (secret) return authz === 'Bearer ' + secret;
  return String(req.headers?.['x-vercel-cron'] || '') === '1';
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Usa GET' });
  }
  if (!cronAutorizado(req)) {
    return res.status(401).json({ ok: false, error: 'No autorizado' });
  }
  try {
    const borradas = await eliminarPublicacionesVendidas();
    console.log(JSON.stringify({ evento: 'limpieza_vendidas', cantidad: borradas.length }));
    return res.status(200).json({ ok: true, eliminadas: borradas.length });
  } catch (e) {
    console.error(JSON.stringify({ evento: 'limpieza_vendidas_error', error: e.message }));
    return res.status(500).json({ ok: false, error: e.message });
  }
}
