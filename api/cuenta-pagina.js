import { readFileSync } from 'fs';
import { join } from 'path';

function idDe(req) {
  if (req.query && req.query.id) return String(req.query.id);
  try {
    const url = new URL(req.url || '', 'http://local');
    if (url.searchParams.get('id')) return url.searchParams.get('id');
    const partes = url.pathname.split('/').filter(Boolean);
    const i = partes.indexOf('cuenta');
    if (i >= 0 && partes[i + 1]) return decodeURIComponent(partes[i + 1]);
  } catch {}
  return '';
}

function leerHtml() {
  const candidatos = [
    join(process.cwd(), 'cuenta.html'),
    join(process.cwd(), '..', 'cuenta.html'),
    '/var/task/cuenta.html',
    '/workspace/cuenta.html'
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
  const id = String(idDe(req) || '').trim();
  let html = leerHtml();
  if (!html) {
    res.statusCode = 200;
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end('<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Cuenta</title></head><body><p>Cuenta no encontrada</p></body></html>');
    return;
  }
  if (id && id !== '[id]') {
    html = html.replace('const pubId=idCuenta();', 'const pubId=idCuenta()||' + JSON.stringify(id) + ';');
  }
  res.statusCode = 200;
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.end(html);
}
