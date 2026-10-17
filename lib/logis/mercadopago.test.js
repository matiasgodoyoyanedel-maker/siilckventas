import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { envFlow, envMercadoPago, urlsDePago, urlsMercadoPago } from './env.js';
import {
  avisoMercadoPagoValido,
  cuerpoPreferenciaMercadoPago,
  esAvisoOrdenMercadoPago,
  extraerAvisoMercadoPago,
  firmarAvisoMercadoPago,
  monedaMercadoPagoValida,
  montoMercadoPagoCoincide,
  pagoMercadoPagoAprobado,
  urlCheckoutMercadoPago
} from './mercadopago.js';

function leer(rel) {
  return readFileSync(new URL('../../' + rel, import.meta.url), 'utf8');
}

test('Mercado Pago cobra el total del servidor y no el amount del cliente', () => {
  const cuerpo = cuerpoPreferenciaMercadoPago({
    total: 11900,
    titulo: 'Cuenta Free Fire',
    email: 'comprador@siilck.cl',
    commerceOrder: 'SIIILCK-abc-1',
    notificationUrl: 'https://www.siiilckventas.com/api/mp/webhook',
    retorno: 'https://www.siiilckventas.com/api/mp/retorno',
    errorUrl: 'https://www.siiilckventas.com/pago/error',
    amount: 1
  });
  assert.equal(cuerpo.items[0].unit_price, 11900);
  assert.equal(cuerpo.items[0].currency_id, 'CLP');
  assert.equal(cuerpo.external_reference, 'SIIILCK-abc-1');
  assert.equal(Object.hasOwn(cuerpo, 'amount'), false);
  assert.equal(cuerpo.notification_url.endsWith('/api/mp/webhook'), true);
  assert.equal(cuerpo.back_urls.success.endsWith('/api/mp/retorno'), true);
});

test('solo un pago approved de Mercado Pago cuenta como pagado', () => {
  assert.equal(pagoMercadoPagoAprobado({ status: 'approved' }), true);
  assert.equal(pagoMercadoPagoAprobado({ status: 'APPROVED' }), true);
  for (const status of ['pending', 'rejected', 'in_process', 'cancelled', 'refunded', 'authorized', '']) {
    assert.equal(pagoMercadoPagoAprobado({ status }), false);
  }
  assert.equal(monedaMercadoPagoValida({ currency_id: 'CLP' }), true);
  assert.equal(monedaMercadoPagoValida({ currency_id: 'ARS' }), false);
  assert.equal(montoMercadoPagoCoincide(11900, 11900), true);
  assert.equal(montoMercadoPagoCoincide(11900, 11900.4), true);
  assert.equal(montoMercadoPagoCoincide(11900, 1), false);
  assert.equal(montoMercadoPagoCoincide(0, 0), false);
});

test('el link de Checkout Pro usa init_point y sandbox solo en prueba', () => {
  const pref = { init_point: 'https://www.mercadopago.cl/checkout/v1/redirect?pref_id=1', sandbox_init_point: 'https://sandbox.mercadopago.cl/checkout' };
  assert.equal(urlCheckoutMercadoPago(pref, { sandbox: false }).includes('www.mercadopago.cl'), true);
  assert.equal(urlCheckoutMercadoPago(pref, { sandbox: true }).includes('sandbox'), true);
  assert.equal(urlCheckoutMercadoPago({}, { sandbox: false }), '');
});

test('el aviso de Mercado Pago se lee del body y la firma se exige si hay secreto', () => {
  const aviso = extraerAvisoMercadoPago({
    query: { type: 'payment', 'data.id': '987' },
    body: { type: 'payment', data: { id: '987' } }
  });
  assert.equal(aviso.id, '987');
  assert.equal(aviso.topic, 'payment');
  assert.equal(esAvisoOrdenMercadoPago('merchant_order'), true);
  assert.equal(esAvisoOrdenMercadoPago('payment'), false);
  const secret = 'secreto-webhook';
  const v1 = firmarAvisoMercadoPago({ id: '987', requestId: 'req-1', ts: '1700000000', secret });
  assert.equal(avisoMercadoPagoValido({
    firmaHeader: `ts=1700000000,v1=${v1}`,
    requestId: 'req-1',
    id: '987',
    secret
  }), true);
  assert.equal(avisoMercadoPagoValido({
    firmaHeader: 'ts=1700000000,v1=deadbeef',
    requestId: 'req-1',
    id: '987',
    secret
  }), false);
  assert.equal(avisoMercadoPagoValido({ firmaHeader: '', requestId: '', id: '987', secret: '' }), true);
});

test('Flow sigue en /api/confirm y /api/retorno; Mercado Pago tiene rutas propias', () => {
  const site = 'https://www.siiilckventas.com';
  const flow = urlsDePago(site);
  const mp = urlsMercadoPago(site);
  assert.equal(flow.urlConfirmation, `${site}/api/confirm`);
  assert.equal(flow.urlReturn, `${site}/api/retorno`);
  assert.equal(mp.notificationUrl, `${site}/api/mp/webhook`);
  assert.equal(mp.retorno, `${site}/api/mp/retorno`);
  assert.equal(envFlow().urlReturn.endsWith('/api/retorno'), true);
  const guardadas = {
    a: process.env.MERCADOPAGO_ACCESS_TOKEN,
    b: process.env.MP_ACCESS_TOKEN,
    c: process.env.MERCADO_PAGO_ACCESS_TOKEN,
    d: process.env.MERCADOPAGO_TOKEN,
    e: process.env.MERCADOPAGO_SANDBOX
  };
  delete process.env.MERCADOPAGO_ACCESS_TOKEN;
  delete process.env.MP_ACCESS_TOKEN;
  delete process.env.MERCADO_PAGO_ACCESS_TOKEN;
  delete process.env.MERCADOPAGO_TOKEN;
  delete process.env.MERCADOPAGO_SANDBOX;
  assert.equal(envMercadoPago().accessToken, '');
  process.env.MP_ACCESS_TOKEN = 'TEST-demo';
  assert.equal(envMercadoPago().sandbox, true);
  delete process.env.MP_ACCESS_TOKEN;
  for (const [clave, valor] of Object.entries({
    MERCADOPAGO_ACCESS_TOKEN: guardadas.a,
    MP_ACCESS_TOKEN: guardadas.b,
    MERCADO_PAGO_ACCESS_TOKEN: guardadas.c,
    MERCADOPAGO_TOKEN: guardadas.d,
    MERCADOPAGO_SANDBOX: guardadas.e
  })) {
    if (valor) process.env[clave] = valor;
  }
});

test('las pantallas de pago ofrecen Flow y Mercado Pago', () => {
  const carrito = leer('carrito.html');
  const ventas = leer('ventas.html');
  const index = leer('index.html');
  const flowCreate = leer('api/flow/create.js');
  const retorno = leer('api/retorno.js');
  const confirm = leer('api/confirm.js');
  assert.match(carrito, /id="btn-pagar-flow"/);
  assert.match(carrito, /id="btn-pagar-mp"/);
  assert.match(carrito, /pagarConFlow\(/);
  assert.match(carrito, /\/api\/flow\/create/);
  assert.match(carrito, /\/api\/mp\/create/);
  assert.match(ventas, /pagarProductoConFlow\(/);
  assert.match(ventas, /pagarProductoConMercadoPago\(/);
  assert.match(index, /comprarPaseVipConFlow\(/);
  assert.match(index, /comprarPaseVipConMercadoPago\(/);
  assert.match(index, /btn-pagar-vip-basico"/);
  assert.match(index, /btn-pagar-vip-basico-mp"/);
  assert.match(flowCreate, /crearPagoDesdeCarrito/);
  assert.match(retorno, /status === 2/);
  assert.match(retorno, /status === 3 \|\| status === 4/);
  assert.match(confirm, /confirmarWebhook/);
  assert.match(leer('api/mp/retorno.js'), /status === 'approved'/);
  assert.match(leer('api/mp/retorno.js'), /status === 'rejected'/);
  assert.match(leer('lib/logis/mercadopago.js'), /=== 'approved'/);
});
