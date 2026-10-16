import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getOferta } from '../oferta.js';

test('un producto viejo o sin oferta no muestra precio tachado', () => {
  assert.equal(getOferta(16000, null), null);
  assert.equal(getOferta(16000, {}), null);
  assert.equal(getOferta(16000, { ofertaActiva: false }), null);
  assert.equal(getOferta(16000, { ofertaDescuento: 10 }), null);
});

test('el 8% arma un precio de referencia redondeado a 100 y cobra el precio real', () => {
  const oferta = getOferta(16000, { ofertaActiva: true, ofertaDescuento: 8 });
  assert.equal(oferta.descuento, 8);
  assert.equal(oferta.ahora, 16000);
  assert.equal(oferta.antes, 17400);
  assert.equal(oferta.ahorro, 1400);
});

test('si falta el porcentaje usa 5 y el total a pagar es el precio de ahora', () => {
  const oferta = getOferta(10000, { ofertaActiva: true });
  assert.equal(oferta.descuento, 5);
  assert.equal(oferta.antes, 10600);
  assert.equal(oferta.ahora, 10000);
});

test('publicar guarda la oferta sin quitar el precio real', () => {
  const html = readFileSync(new URL('../../publicacion.html', import.meta.url), 'utf8');
  assert.match(html, /id="activarOferta"/);
  assert.match(html, /id="descuentoPorcentaje"/);
  assert.match(html, /ofertaActiva,ofertaDescuento/);
  assert.match(html, /precio,nivel,region,stock,descripcion/);
});
