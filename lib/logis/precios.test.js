import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularMonto, preciosPaseVipDesdeConfig, tasaDescuentoVip, totalConIva } from './precios.js';
import { armarItemPaseVip, validarEmail } from './validacion.js';
import { hayStock } from './stock.js';
import { camposPerfilVip, decodificarDato } from './entrega.js';
import { firmarFlow, resolverMontoFlow } from './pagos.js';
import { envFlow, hayClavesFlow } from './env.js';

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

test('env.js lee FLOW_API_KEY / FLOW_SECRET_KEY del entorno', () => {
  const env = envFlow();
  assert.equal(env.urlReturn.endsWith('/carrito.html?ok=1'), true);
  assert.equal(typeof hayClavesFlow(), 'boolean');
});

test('pagos.js firma Flow igual que el endpoint original', () => {
  const s = firmarFlow({ amount: '1000', apiKey: 'abc' }, 'secret');
  assert.match(s, /^[a-f0-9]{64}$/);
});

test('precios.js cobra el precio que ya trae el carrito', () => {
  const montos = calcularMonto({
    items: [{ publicacionId: 'p1', titulo: 'Cuenta', precio: 12841, cantidad: 1 }],
    perfil: {}
  });
  assert.equal(montos.ok, true);
  assert.equal(montos.subtotal, 12841);
  assert.equal(montos.iva, Math.round(12841 * 0.19));
  assert.equal(montos.total, montos.subtotal + montos.iva);
});

test('precios.js no aplica descuento VIP al pase, sí a las cuentas', () => {
  const futuro = new Date(Date.now() + 86400000);
  const montos = calcularMonto({
    items: [
      { tipoItem: 'cuenta', precio: 10000, cantidad: 1 },
      { tipoItem: 'pase_vip', tipoVipPase: 'pro', precio: 5090, cantidad: 1 }
    ],
    perfil: { esVendedorVip: true, tipoVip: 'pro', vipExpira: futuro }
  });
  assert.equal(montos.subtotal, 15090);
  assert.equal(montos.descuento, Math.round(10000 * 0.10));
  assert.equal(montos.iva, Math.round(15090 * 0.19));
});

test('pase VIP cobra el precio de Firestore/config más IVA 19%', () => {
  const config = { precioPaseVipBasico: 4000, precioPaseVipPro: 8000 };
  const precios = preciosPaseVipDesdeConfig(config);
  assert.equal(precios.basico, 4000);
  assert.equal(precios.pro, 8000);
  const item = armarItemPaseVip('basico', config);
  assert.equal(item.precio, 4000);
  assert.equal(item.tipoItem, 'pase_vip');
  const montos = calcularMonto({ items: [item], perfil: {} });
  assert.equal(montos.subtotal, 4000);
  assert.equal(montos.iva, 760);
  assert.equal(montos.total, 4760);
  assert.equal(totalConIva(8000).total, 9520);
});

test('VIP usa el amount del botón si la validación no corre, igual que el carrito', () => {
  assert.equal(resolverMontoFlow(null, 3558), 3558);
  assert.equal(resolverMontoFlow({ ok: true, total: 4760 }, 3558), 4760);
  assert.equal(resolverMontoFlow({ ok: false }, '3558'), 3558);
});

test('activar VIP escribe isVip y plan vip en el perfil', () => {
  const campos = camposPerfilVip('pro', new Date('2030-01-01T00:00:00Z'));
  assert.equal(campos.isVip, true);
  assert.equal(campos.plan, 'vip');
  assert.equal(campos.esVendedorVip, true);
  assert.equal(campos.tipoVip, 'pro');
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
