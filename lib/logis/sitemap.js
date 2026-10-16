import { readFileSync } from 'node:fs';

const ORIGEN = 'https://www.siiilckventas.com';

export function categoriasDelCatalogo() {
  try {
    const src = readFileSync(new URL('../gamesList.js', import.meta.url), 'utf8');
    return [...src.matchAll(/query:\s*"([^"]+)"/g)].map((m) => m[1]);
  } catch {
    return [];
  }
}

export function escaparXml(valor) {
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function urlsPublicas(origen = ORIGEN, categorias, productos = []) {
  const base = String(origen || ORIGEN).replace(/\/$/, '');
  const lista = categorias && categorias.length ? categorias : categoriasDelCatalogo();
  const urls = [`${base}/`, `${base}/ventas.html`];
  lista.forEach((juego) => {
    urls.push(`${base}/ventas.html?juego=${encodeURIComponent(juego)}`);
  });
  productos.forEach((id) => {
    if (id) urls.push(`${base}/ventas.html?pub=${encodeURIComponent(id)}`);
  });
  return urls;
}

export function xmlSitemap(urls) {
  const cuerpo = urls.map((url) => `  <url><loc>${escaparXml(url)}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${cuerpo}\n</urlset>\n`;
}
