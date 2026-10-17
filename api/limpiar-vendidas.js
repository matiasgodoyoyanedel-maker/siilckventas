import { eliminarPublicacionesVendidas } from '../lib/logis/stock.js';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Usa GET' });
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
