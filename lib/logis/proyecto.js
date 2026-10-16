import { readFileSync } from 'node:fs';

function proyectoDesdeWeb() {
  const rutas = [
    new URL('../../index.html', import.meta.url),
    new URL('index.html', `file://${process.cwd()}/`)
  ];
  for (const ruta of rutas) {
    try {
      const html = readFileSync(ruta, 'utf8');
      const id = html.match(/projectId:"([^"]+)"/);
      if (id && id[1]) return id[1];
    } catch {
      // La otra ruta cubre el empaquetado de Vercel.
    }
  }
  return '';
}

// El id del proyecto sale de la web, no de un valor pegado aquí.
// Si FIREBASE_PROJECT_ID en Vercel no coincide, los tokens de login se rechazaban.
export const PROYECTO_CLIENTE = proyectoDesdeWeb() || String(process.env.FIREBASE_PROJECT_ID || '').trim();

export function normalizarPrivateKey(key) {
  if (typeof key !== 'string') return '';
  let out = key.trim();
  if ((out.startsWith('"') && out.endsWith('"')) || (out.startsWith("'") && out.endsWith("'"))) {
    out = out.slice(1, -1);
  }
  return out.replace(/\\n/g, '\n').replace(/\r\n/g, '\n').trim();
}

export function parseCuentaServicio(raw) {
  let value = raw;
  if (typeof value === 'string') {
    value = JSON.parse(value.trim());
    if (typeof value === 'string') value = JSON.parse(value);
  }
  if (!value || typeof value !== 'object') {
    throw new Error('FIREBASE_SERVICE_ACCOUNT no es un JSON válido.');
  }
  if (value.private_key) value.private_key = normalizarPrivateKey(value.private_key);
  if (value.privateKey) value.privateKey = normalizarPrivateKey(value.privateKey);
  return value;
}
