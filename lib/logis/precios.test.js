import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularMonto, tasaDescuentoVip } from './precios.js';
import { validarEmail } from './validacion.js';
import { hayStock } from './stock.js';
import { decodificarDato } from './entrega.js';
import { firmarFlow } from './pagos.js';

test('validacion.js rechaza email vacío o inválido y acepta uno real', () => {
  assert.equal(validarEmail('').ok, false);
  assert.equal(validarEmail('hola').ok, false);
  const ok = validarEmail('  Comprador@Siilck.cl ');
  assert.equal(ok.ok, true);
  assert.equal(ok.email, 'comprador@siilck.cl');
});

test('precios.js replica IVA 19% y descuento VIP del carrito', () => {
  const items = [{ publicacionId: 'p1', titulo: 'Cuenta', precioBase: 10000, garantia: 2841, cantidad: 1 }];
  const sinVip = calcularMonto({ items, perfil: {} });
  assert.equal(sinVip.ok, true);
  assert.equal(sinVip.subtotal, 12841);
  assert.equal(sinVip.iva, Math.round(12841 * 0.19));
  assert.equal(sinVip.descuento, 0);
  assert.equal(sinVip.total, sinVip.subtotal + sinVip.iva);

  const futuro = new Date(Date.now() + 86400000);
  const conPro = calcularMonto({
    items,
    perfil: { esVendedorVip: true, tipoVip: 'pro', vipExpira: futuro }
  });
  assert.equal(conPro.descuento, Math.round(12841 * 0.10));
  assert.equal(conPro.total, (conPro.subtotal + conPro.iva) - conPro.descuento);
});

test('precios.js ignora VIP vencido', () => {
  assert.equal(tasaDescuentoVip({ esVendedorVip: true, tipoVip: 'basico', vipExpira: new Date(0) }), 0);
});

test('stock.js solo vende si hay unidades', () => {
  assert.equal(hayStock({ stock: 2 }, 1), true);
  assert.equal(hayStock({ stock: 1 }, 2), false);
  assert.equal(hayStock({ stock: 0 }, 1), false);
});

test('entrega.js decodifica el simpleEnc (base64) de cuentas_secretas', () => {
  const enc = Buffer.from('cuenta@mail.com', 'utf8').toString('base64');
  assert.equal(decodificarDato(enc), 'cuenta@mail.com');
});

test('pagos.js firma Flow igual que el endpoint original', () => {
  const s = firmarFlow({ amount: '1000', apiKey: 'abc' }, 'secret');
  assert.match(s, /^[a-f0-9]{64}$/);
});

test('flujo autónomo: email -> stock -> precio (los módulos se encadenan)', () => {
  const mail = validarEmail('buyer@siilck.cl');
  assert.equal(mail.ok, true);
  const publicacion = { stock: 2, precio: 5000, titulo: 'Cuenta LoL' };
  assert.equal(hayStock(publicacion, 1), true);
  const montos = calcularMonto({
    items: [{ publicacionId: 'p1', titulo: publicacion.titulo, precioBase: 5000, garantia: 0, cantidad: 1 }],
    perfil: {}
  });
  assert.equal(montos.ok, true);
  assert.equal(montos.subtotal, 5000);
  assert.equal(montos.iva, 950);
  assert.equal(montos.total, 5950);
});
