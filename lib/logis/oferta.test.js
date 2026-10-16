import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getOferta } from '../oferta.js';
import { itemDesdePublicacion } from './validacion.js';

test('un producto viejo o sin oferta no muestra precio tachado', () => {
  assert.equal(getOferta(16000, null), null);
  assert.equal(getOferta(16000, {}), null);
  assert.equal(getOferta(16000, { ofertaActiva: false }), null);
  assert.equal(getOferta(16000, { ofertaDescuento: 10 }), null);
});

test('el 8% tacha el precio escrito y cobra el descuento redondeado a 100', () => {
  const oferta = getOferta(32000, { ofertaActiva: true, ofertaDescuento: 8 });
  assert.equal(oferta.descuento, 8);
  assert.equal(oferta.antes, 32000);
  assert.equal(oferta.ahora, 29400);
  assert.equal(oferta.ahorro, 2600);
});

test('si falta el porcentaje usa 8 y Flow cobra el precio con descuento', () => {
  const oferta = getOferta(10000, { ofertaActiva: true });
  assert.equal(oferta.descuento, 8);
  assert.equal(oferta.antes, 10000);
  assert.equal(oferta.ahora, 9200);
  assert.equal(oferta.ahorro, 800);
});

test('Flow cobra el precio con descuento y no el tachado', () => {
  const item = itemDesdePublicacion(
    { id: 'pub1', titulo: 'DayZ', precio: 32000, stock: 1, ofertaActiva: true, ofertaDescuento: 8 },
    { garantia: 2841 }
  );
  assert.equal(item.ok, true);
  assert.equal(item.item.precioBase, 32000);
  assert.equal(item.item.precioFinal, 29400);
  assert.equal(item.item.precio, 29400 + 2841);
});

test('publicar guarda la oferta sin quitar el precio real', () => {
  const html = readFileSync(new URL('../../publicacion.html', import.meta.url), 'utf8');
  assert.match(html, /id="activarOferta"/);
  assert.match(html, /id="descuentoPorcentaje"/);
  assert.match(html, /ofertaActiva,ofertaDescuento,precioFinal/);
  assert.match(html, /precio,nivel,region,stock,descripcion/);
});
