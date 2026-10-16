import test from 'node:test';
import assert from 'node:assert/strict';
import { convertPrice, formatPrice } from '../currency.js';

test('1 USD equivale a 950 CLP y 25000 CLP se ven en dólar', () => {
  assert.equal(convertPrice(950, 'USD'), 1);
  assert.equal(convertPrice(25000, 'USD'), 26.32);
  assert.equal(formatPrice(25000, 'USD'), '$26.32 USD');
  assert.equal(formatPrice(25000, 'CLP'), '$25.000');
  assert.equal(formatPrice(25000), '$25.000');
});

test('euro y real usan su símbolo sin cambiar el precio en CLP', () => {
  assert.equal(convertPrice(1030, 'EUR'), 1);
  assert.equal(formatPrice(1030, 'EUR'), '€1.00');
  assert.equal(convertPrice(175, 'BRL'), 1);
  assert.equal(formatPrice(175, 'BRL'), 'R$1.00');
  assert.equal(convertPrice(25000, 'CLP'), 25000);
});
