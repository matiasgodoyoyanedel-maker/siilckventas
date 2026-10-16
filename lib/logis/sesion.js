import { createVerify } from 'crypto';
import { authAdmin } from './db.js';
import { PROYECTO_CLIENTE } from './proyecto.js';

const CERT_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const SESION_INVALIDA = 'Sesión inválida o expirada. Vuelve a iniciar sesión.';

let cacheCerts = { exp: 0, certs: null };

export function validarClaimsToken(payload, ahora = Date.now()) {
  if (!payload || typeof payload !== 'object') return { ok: false, code: 'token_invalido' };
  if (payload.aud !== PROYECTO_CLIENTE) return { ok: false, code: 'aud' };
  if (payload.iss !== `https://securetoken.google.com/${PROYECTO_CLIENTE}`) return { ok: false, code: 'iss' };
  if (typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 128) {
    return { ok: false, code: 'sub' };
  }
  const skew = 5 * 60 * 1000;
  const exp = Number(payload.exp || 0) * 1000;
  const iat = Number(payload.iat || 0) * 1000;
  if (!exp || exp + skew < ahora) return { ok: false, code: 'token_expirado' };
  if (iat && iat - skew > ahora) return { ok: false, code: 'token_futuro' };
  return { ok: true, uid: payload.sub, email: typeof payload.email === 'string' ? payload.email : '' };
}

function decodificarParte(parte) {
  return JSON.parse(Buffer.from(parte, 'base64url').toString('utf8'));
}

export function verificarFirmaConCertificado(idToken, certs, ahora = Date.now()) {
  const partes = String(idToken || '').trim().split('.');
  if (partes.length !== 3) {
    const err = new Error('Token incompleto');
    err.code = 'token_invalido';
    throw err;
  }
  let header;
  let payload;
  try {
    header = decodificarParte(partes[0]);
    payload = decodificarParte(partes[1]);
  } catch {
    const err = new Error('Token ilegible');
    err.code = 'token_invalido';
    throw err;
  }
  const claims = validarClaimsToken(payload, ahora);
  if (!claims.ok) {
    const err = new Error('Claims inválidos');
    err.code = claims.code;
    throw err;
  }
  const cert = header && header.alg === 'RS256' ? certs?.[header.kid] : '';
  if (!cert || typeof cert !== 'string') {
    const err = new Error('La clave del token no está vigente');
    err.code = 'token_expirado';
    throw err;
  }
  const verifier = createVerify('RSA-SHA256');
  verifier.update(`${partes[0]}.${partes[1]}`);
  verifier.end();
  let firmaOk = false;
  try {
    firmaOk = verifier.verify(cert, Buffer.from(partes[2], 'base64url'));
  } catch {
    firmaOk = false;
  }
  if (!firmaOk) {
    const err = new Error('Firma inválida');
    err.code = 'firma';
    throw err;
  }
  return claims;
}

async function certificadosFirebase() {
  if (cacheCerts.certs && cacheCerts.exp > Date.now()) return cacheCerts.certs;
  const res = await fetch(CERT_URL, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) {
    const err = new Error('No se pudieron leer las claves públicas de Firebase.');
    err.code = 'cert_fetch';
    throw err;
  }
  const certs = await res.json();
  const cacheControl = res.headers.get('cache-control') || '';
  const maxAge = /max-age=(\d+)/.exec(cacheControl);
  const ttl = Math.max(60_000, (maxAge ? Number(maxAge[1]) : 3600) * 1000);
  cacheCerts = { certs, exp: Date.now() + ttl };
  return certs;
}

function errorSesion(code) {
  if (code === 'token_expirado' || code === 'auth/id-token-expired') {
    return { ok: false, error: 'Tu sesión se estaba renovando. Vuelve a intentar el pago.', code: 'token_expirado' };
  }
  return { ok: false, error: SESION_INVALIDA, code: code || 'sesion_invalida' };
}

export async function verificarTokenSesion(idToken) {
  const token = String(idToken || '').trim();
  if (!token) return { ok: false, error: 'Debes iniciar sesión para comprar.', code: 'sin_token' };
  try {
    const decoded = await authAdmin().verifyIdToken(token);
    return { ok: true, uid: decoded.uid, email: decoded.email || '' };
  } catch (e) {
    console.error(JSON.stringify({
      evento: 'verify_id_token_admin',
      code: e?.code || '',
      error: String(e?.message || '').slice(0, 220)
    }));
    try {
      const certs = await certificadosFirebase();
      const claims = verificarFirmaConCertificado(token, certs);
      return { ok: true, uid: claims.uid, email: claims.email || '' };
    } catch (e2) {
      console.error(JSON.stringify({
        evento: 'verify_id_token_fallback',
        code: e2?.code || '',
        error: String(e2?.message || '').slice(0, 220)
      }));
      return errorSesion(e2?.code || e?.code || '');
    }
  }
}
