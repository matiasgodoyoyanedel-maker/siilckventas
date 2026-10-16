import test from 'node:test';
import assert from 'node:assert/strict';
import { createSign, generateKeyPairSync } from 'node:crypto';
import { readFileSync as readText } from 'node:fs';
import { PROYECTO_CLIENTE, normalizarPrivateKey, parseCuentaServicio } from './proyecto.js';
import { validarClaimsToken, verificarFirmaConCertificado } from './sesion.js';

function b64(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function tokenFirmado(privateKey, payload, kid = 'k1') {
  const header = b64({ alg: 'RS256', kid });
  const body = b64(payload);
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${body}`);
  signer.end();
  return `${header}.${body}.${signer.sign(privateKey).toString('base64url')}`;
}

test('la clave privada de Firebase acepta saltos escapados', () => {
  assert.equal(normalizarPrivateKey('linea\\nlinea'), 'linea\nlinea');
  assert.equal(normalizarPrivateKey('linea\nlinea'), 'linea\nlinea');
  const parsed = parseCuentaServicio('{"private_key":"linea\\\\nlinea","client_email":"a@b.c"}');
  assert.equal(parsed.private_key, 'linea\nlinea');
});

test('el proyecto de Auth es el mismo de la web', () => {
  const html = readText(new URL('../../index.html', import.meta.url), 'utf8');
  const id = html.match(/projectId:"([^"]+)"/)[1];
  assert.equal(PROYECTO_CLIENTE, id);
});

test('un id token firmado del proyecto de la web es válido', () => {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const ahora = Math.floor(Date.now() / 1000);
  const token = tokenFirmado(privateKey, {
    aud: PROYECTO_CLIENTE,
    iss: `https://securetoken.google.com/${PROYECTO_CLIENTE}`,
    sub: 'usuario123',
    email: 'comprador@siilck.cl',
    iat: ahora,
    exp: ahora + 3600
  });
  const pem = publicKey.export({ type: 'spki', format: 'pem' });
  const claims = verificarFirmaConCertificado(token, { k1: pem });
  assert.equal(claims.uid, 'usuario123');
  assert.equal(claims.email, 'comprador@siilck.cl');
});

test('rechaza tokens de otro proyecto, vencidos o con otra firma', () => {
  const ahoraSeg = Math.floor(Date.now() / 1000);
  assert.equal(validarClaimsToken({
    aud: 'otro-proyecto',
    iss: 'https://securetoken.google.com/otro-proyecto',
    sub: 'x',
    iat: ahoraSeg,
    exp: ahoraSeg + 100
  }).ok, false);
  assert.equal(validarClaimsToken({
    aud: PROYECTO_CLIENTE,
    iss: `https://securetoken.google.com/${PROYECTO_CLIENTE}`,
    sub: 'x',
    iat: ahoraSeg - 7200,
    exp: ahoraSeg - 3600
  }).code, 'token_expirado');

  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const { privateKey: otra } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const token = tokenFirmado(otra, {
    aud: PROYECTO_CLIENTE,
    iss: `https://securetoken.google.com/${PROYECTO_CLIENTE}`,
    sub: 'usuario123',
    iat: ahoraSeg,
    exp: ahoraSeg + 3600
  });
  assert.throws(
    () => verificarFirmaConCertificado(token, { k1: publicKey.export({ type: 'spki', format: 'pem' }) }),
    (err) => err.code === 'firma'
  );
});

test('el lobby centra el sello bajo Bienvenido y el pago renueva la sesión', () => {
  const index = readText(new URL('../../index.html', import.meta.url), 'utf8');
  const carrito = readText(new URL('../../carrito.html', import.meta.url), 'utf8');
  const pub = readText(new URL('../../publicacion.html', import.meta.url), 'utf8');
  const ventas = readText(new URL('../../ventas.html', import.meta.url), 'utf8');
  assert.match(index, /<h1[^>]*>Bienvenido a SiilckVentas<\/h1>\s*<div class="welcome-badge"[^>]*>MARKETPLACE & ESCROW/);
  assert.equal(index.includes('welcome-top-left'), false);
  assert.match(index, /if\(p\.vendida\) return/);
  assert.match(carrito, /getIdToken\(true\)/);
  assert.match(pub, /Tu publicación ya ha sido publicada/);
  assert.match(pub, /publicacionEnCurso/);
  assert.match(ventas, /Cuentas disponibles/);
  assert.match(ventas, /p\.vendida \|\| stockNum <= 0/);
});
