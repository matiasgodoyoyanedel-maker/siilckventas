import { getDb } from '../lib/logis/db.js';

const HTML = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Mantenimiento - SiilckVentas</title>
<link rel="icon" href="/favicon.ico">
<link rel="icon" type="image/png" href="/icon.png">
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#050014;color:#fff;font-family:Georgia,sans-serif;padding:24px}
  .caja{max-width:440px;text-align:center}
  img{width:88px;height:88px;border-radius:22px}
  h1{font-size:28px;margin:18px 0 8px}
  p{color:#d4d4d8;line-height:1.5}
  a{color:#facc15}
</style>
</head>
<body>
  <div class="caja">
    <img src="/icon.png" alt="SiilckVentas">
    <h1>Estamos mejorando la web, volvemos en breve</h1>
    <p>SiilckVentas está en mantenimiento. El marketplace vuelve en unos minutos.</p>
    <p><a href="/login">Entrar como administrador</a></p>
  </div>
</body>
</html>`;

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).end();
  }
  let activo = false;
  try {
    const snap = await getDb().collection('configuracion').doc('global').get();
    const data = snap.exists ? snap.data() : {};
    activo = !!(data.maintenance_mode || data.mantenimientoActivo);
  } catch (e) {
    console.error(JSON.stringify({ evento: 'mantenimiento_lectura', error: e.message }));
  }
  if (!activo) {
    res.writeHead(302, { Location: '/', 'Cache-Control': 'no-store' });
    return res.end();
  }
  res.statusCode = 503;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Retry-After', '3600');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'HEAD') return res.end();
  return res.end(HTML);
}
