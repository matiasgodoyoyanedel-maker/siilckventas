import { readFileSync } from 'fs';
import { join } from 'path';

function uidDe(req) {
  if (req.query && (req.query.uid || req.query.id)) return String(req.query.uid || req.query.id);
  try {
    const url = new URL(req.url || '', 'http://local');
    if (url.searchParams.get('uid') || url.searchParams.get('id')) {
      return url.searchParams.get('uid') || url.searchParams.get('id');
    }
    const partes = url.pathname.split('/').filter(Boolean);
    const i = partes.indexOf('vendedor');
    if (i >= 0 && partes[i + 1]) return decodeURIComponent(partes[i + 1]);
  } catch {}
  return '';
}

function leerHtml() {
  const candidatos = [
    join(process.cwd(), 'vendedor.html'),
    join(process.cwd(), '..', 'vendedor.html'),
    '/var/task/vendedor.html',
    '/workspace/vendedor.html'
  ];
  for (const ruta of candidatos) {
    try {
      return readFileSync(ruta, 'utf8');
    } catch {}
  }
  return '';
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  const uid = String(uidDe(req) || '').trim();
  let html = leerHtml();
  if (!html) {
    res.statusCode = 200;
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end('<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Vendedor</title></head><body><p>Vendedor no encontrado. <a href="/ventas.html">Marketplace</a></p></body></html>');
    return;
  }
  if (uid) {
    html = html.replace('const uid=uidVendedor();', 'const uid=uidVendedor()||' + JSON.stringify(uid) + ';');
  }
  res.statusCode = 200;
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.end(html);
}
