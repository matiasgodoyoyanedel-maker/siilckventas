import { getDb } from '../lib/logis/db.js';
import { urlSitioDesdeRequest } from '../lib/logis/env.js';
import { cuentaEstaDisponible } from '../lib/logis/stock.js';

function escaparXml(texto) {
  return String(texto || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function fechaW3C(fecha) {
  try {
    const d = fecha instanceof Date ? fecha : new Date(fecha);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().split('.')[0] + 'Z';
  } catch {
    return null;
  }
}

export async function generarSitemap(siteUrl, db) {
  const base = String(siteUrl || '').replace(/\/$/, '');
  const ahora = new Date().toISOString().split('.')[0] + 'Z';

  const paginasEstaticas = [
    { loc: '/', changefreq: 'daily', priority: '1.0' },
    { loc: '/ventas.html', changefreq: 'always', priority: '0.9' },
    { loc: '/vender.html', changefreq: 'monthly', priority: '0.7' },
    { loc: '/login.html', changefreq: 'monthly', priority: '0.5' },
    { loc: '/recuperar-contrasena.html', changefreq: 'yearly', priority: '0.3' },
    { loc: '/saldo.html', changefreq: 'weekly', priority: '0.5' },
    { loc: '/foro.html', changefreq: 'daily', priority: '0.6' }
  ];

  let urls = paginasEstaticas.map((p) => `  <url>\n    <loc>${base}${p.loc}</loc>\n    <lastmod>${ahora}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`);

  try {
    const database = db || getDb();
    const snap = await database.collection('publicaciones').get();
    const dinamicas = [];
    snap.forEach((doc) => {
      const data = doc.data() || {};
      if (!cuentaEstaDisponible(data)) return;
      const fecha = data.creadoEn || data.creadaEn || data.fecha;
      const lastmod = fechaW3C(fecha) || ahora;
      dinamicas.push(`  <url>\n    <loc>${base}/cuenta/${escaparXml(doc.id)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`);
    });
    urls = urls.concat(dinamicas);
  } catch (e) {
    console.error(JSON.stringify({ evento: 'sitemap_error', error: e.message }));
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    const siteUrl = urlSitioDesdeRequest(req);
    const xml = await generarSitemap(siteUrl);
    res.status(200).send(xml);
  } catch (e) {
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  }
}
