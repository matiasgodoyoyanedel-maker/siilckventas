import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { diagnosticoFirebase } from './db.js';
import { normalizarPrivateKey } from './proyecto.js';
import { validarCalificacion } from './reviews.js';
import { urlsPublicas, xmlSitemap, categoriasDelCatalogo } from './sitemap.js';

test('la verificación de Google es una sola línea', () => {
  const esperado = 'google-site-verification: google78561bbab4dd18b7.html';
  assert.equal(readFileSync(new URL('../../google78561bbab4dd18b7.html', import.meta.url), 'utf8').trim(), esperado);
  assert.equal(readFileSync(new URL('../../public/google78561bbab4dd18b7.html', import.meta.url), 'utf8').trim(), esperado);
  const robots = readFileSync(new URL('../../robots.txt', import.meta.url), 'utf8');
  assert.match(robots, /Allow: \//);
  assert.match(robots, /Sitemap: https:\/\/www\.siiilckventas\.com\/sitemap\.xml/);
});

test('el sitemap incluye el inicio, las categorías y el producto', () => {
  const categorias = categoriasDelCatalogo();
  assert.ok(categorias.includes('valorant'));
  assert.ok(categorias.includes('netflix'));
  const xml = xmlSitemap(urlsPublicas('https://www.siiilckventas.com', categorias, ['cuenta 1']));
  assert.match(xml, /<loc>https:\/\/www\.siiilckventas\.com\/<\/loc>/);
  assert.match(xml, /juego=valorant/);
  assert.match(xml, /juego=netflix/);
  assert.match(xml, /pub=cuenta%201/);
});

test('Firebase Admin acepta la llave suelta con saltos escapados', () => {
  const key = '"-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----\\n"';
  assert.match(normalizarPrivateKey(key), /BEGIN PRIVATE KEY/);
  const diag = diagnosticoFirebase({
    FIREBASE_CLIENT_EMAIL: 'admin@proyecto.iam.gserviceaccount.com',
    FIREBASE_PRIVATE_KEY: key,
    FIREBASE_PROJECT_ID: 'proyecto'
  });
  assert.equal(diag.ok, true);
  assert.equal(diag.tieneKey, true);
  assert.equal(diagnosticoFirebase({}).ok, false);
});

test('una compra solo se califica una vez, de 1 a 5, con comentario', () => {
  assert.equal(validarCalificacion({ orderId: 'SIIILCK-1', rating: 5, comment: 'Llegó al tiro' }).ok, true);
  assert.equal(validarCalificacion({ orderId: 'SIIILCK-1', rating: 5, comment: '   ' }).ok, false);
  assert.match(validarCalificacion({ orderId: 'SIIILCK-1', rating: 0, comment: 'mal' }).error, /1 a 5/);
  assert.equal(validarCalificacion({ orderId: '', rating: 4, comment: 'ok' }).ok, false);
});
