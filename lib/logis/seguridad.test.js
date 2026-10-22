import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function leer(rel) {
  return readFileSync(new URL('../../' + rel, import.meta.url), 'utf8');
}

test('el checkout exige token y no publica sin vendedor aprobado', () => {
  const validacion = leer('lib/logis/validacion.js');
  const reglas = leer('firestore.rules');
  const mp = leer('api/mp/create.js');
  const flow = leer('api/flow/create.js');
  const crear = leer('api/crear.js');
  const limpia = leer('api/limpiar-vendidas.js');
  assert.match(validacion, /if \(!idToken\) return \{ ok: false, error: 'Debes iniciar sesión para comprar\.' \}/);
  assert.match(mp, /Debes iniciar sesión para comprar/);
  assert.match(flow, /Debes iniciar sesión para comprar/);
  assert.match(crear, /Debes iniciar sesión para comprar/);
  assert.match(reglas, /'role', 'esAdmin', 'is_seller'/);
  assert.match(reglas, /vendedorAprobado/);
  assert.match(limpia, /CRON_SECRET/);
  assert.match(limpia, /x-vercel-cron/);
});

test('el marketplace destaca el título y el carrusel marca la carta central', () => {
  const ventas = leer('ventas.html');
  const index = leer('index.html');
  const games = leer('lib/gamesList.js');
  assert.match(ventas, /sv-mcard-titulo/);
  assert.match(ventas, /Marketplace de Cuentas Activas/);
  assert.match(ventas, /impulsarPublicacion/);
  assert.match(ventas, /htmlEntregaInmediata/);
  assert.match(index, /is-center/);
  assert.match(index, /perspective\(820px\)/);
  assert.match(index, /id="faq-inicio"/);
  assert.match(index, /sv-faq-q/);
  assert.match(index, /aria-expanded/);
  assert.match(index, /#070d18/);
  assert.match(games, /img\/games\/apex\.webp/);
  games.split('{ id:').forEach((bloque) => {
    if (bloque.includes('categoria: "juego"')) {
      assert.equal(bloque.includes('images.pexels.com'), false);
    }
  });
});

test('el foro y el chat no pintan HTML crudo', () => {
  const foro = leer('foro.html');
  const ventas = leer('ventas.html');
  assert.match(foro, /escHtml\(t\.titulo\)/);
  assert.match(foro, /escHtml\(t\.contenido\)/);
  assert.match(ventas, /escHtml\(m\.texto\)/);
  assert.match(ventas, /escHtml\(p\.juego\)/);
});
