import { getDb } from '../lib/logis/db.js';
import { cuentaEstaDisponible } from '../lib/logis/stock.js';
import { urlsPublicas, xmlSitemap } from '../lib/logis/sitemap.js';

export default async function handler(req, res) {
  const productos = [];
  try {
    const snap = await getDb().collection('publicaciones').limit(500).get();
    snap.forEach((doc) => {
      if (cuentaEstaDisponible(doc.data())) productos.push(doc.id);
    });
  } catch (e) {
    console.error(JSON.stringify({ evento: 'sitemap_sin_productos', error: e.message }));
  }
  const xml = xmlSitemap(urlsPublicas('https://www.siiilckventas.com', undefined, productos));
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=600');
  res.status(200).send(xml);
}
