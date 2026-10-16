import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function leer(rel) {
  return readFileSync(new URL('../../' + rel, import.meta.url), 'utf8');
}

test('el home muestra la barra de confianza y el panel guarda el mantenimiento', () => {
  const index = leer('index.html');
  const panel = leer('panel.html');
  const guardia = leer('guardia.js');
  const api = leer('api/mantenimiento.js');
  assert.match(index, /ESCROW PROTEGIDO/);
  assert.match(index, /ENTREGA INMEDIATA/);
  assert.match(index, /VERIFICADAS A MANO/);
  assert.equal(index.includes('cuentas disponibles •'), false);
  assert.match(panel, /maintenance_mode/);
  assert.match(panel, /is_blocked: nuevoEstado/);
  assert.match(panel, /is_seller: nuevoEstado/);
  assert.match(guardia, /Has sido bloqueado, no puedes seguir navegando en esta web/);
  assert.match(guardia, /Felicidades, ahora eres vendedor de nuestra página/);
  assert.match(api, /statusCode = 503/);
  assert.match(api, /Estamos mejorando la web, volvemos en breve/);
});
