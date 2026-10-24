import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const ctx = { window: {}, console };
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL('../../lib/gamesList.js', import.meta.url), 'utf8'), ctx);

const foto = ctx.window.siilckFotoCatalogo;
const cat = ctx.window.siilckCatalogoJuego;
const games = ctx.window.SIILCK_GAMES;

test('el catalogo respeta el juego o servicio y usa la foto oficial', () => {
  assert.equal(typeof foto, 'function');
  assert.equal(cat('YouTube Premium').id, 'youtube');
  assert.equal(cat('youtube').id, 'youtube');
  assert.match(foto({ juego: 'YouTube Premium', titulo: 'Cuenta YT', foto: 'vieja.png' }), /youtube/);
  assert.match(foto({ juego: 'Valorant', foto: 'otra.jpg' }), /valorant/);
  assert.match(foto({ titulo: 'YouTube Premium 12 meses', foto: 'x.png' }), /youtube/);
  assert.match(foto({ juego: 'CapCut', titulo: 'CapCut Pro' }), /capcut/);
  assert.match(foto({ juego: 'Canva Pro', titulo: 'CapCut Pro 1 mes - CapCut venta' }), /capcut/);
  assert.equal(foto({ titulo: 'algo random', foto: 'mia.jpg' }), 'mia.jpg');
  assert.ok(games.some((g) => g.id === 'capcut'));
  games.filter((g) => g.categoria === 'juego').forEach((g) => {
    assert.equal(String(g.img).includes('images.pexels.com'), false);
  });
});
