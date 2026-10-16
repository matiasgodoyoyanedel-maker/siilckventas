import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calcularMonto, preciosPaseVipDesdeConfig, tasaDescuentoVip, totalConIva } from './precios.js';
import { armarItemCuenta, armarItemPaseVip, identidadComprador, precioCuentaServidor, validarEmail } from './validacion.js';
import { cuentaEstaDisponible, debeEliminarPublicacion, hayStock } from './stock.js';
import { anonimizarNombre } from './actividad.js';
import { camposPerfilVip, decodificarDato } from './entrega.js';
import { estadoHttpPago, firmarFlow, MINIMO_FLOW, resolverMontoFlow } from './pagos.js';
import { envFlow, hayClavesFlow, urlSitioDesdeRequest, urlsDePago } from './env.js';
import { datosCuentaDesdeSecreto, puedeVerDatosCuenta, quitarSecretos } from './entrega.js';

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

test('una cuenta vendida no cuenta como disponible', () => {
  assert.equal(cuentaEstaDisponible({ stock: 2 }), true);
  assert.equal(cuentaEstaDisponible({}), true);
  assert.equal(cuentaEstaDisponible({ stock: 0 }), false);
  assert.equal(cuentaEstaDisponible({ vendida: true, stock: 3 }), false);
  assert.equal(cuentaEstaDisponible({ vendida: true }), false);
});

test('entrega.js decodifica el simpleEnc (base64) de cuentas_secretas', () => {
  const enc = Buffer.from('cuenta@mail.com', 'utf8').toString('base64');
  assert.equal(decodificarDato(enc), 'cuenta@mail.com');
});

test('env.js lee FLOW_API_KEY / FLOW_SECRET_KEY del entorno', () => {
  const env = envFlow();
  assert.equal(env.urlReturn.endsWith('/api/retorno'), true);
  assert.equal(typeof hayClavesFlow(), 'boolean');
});

test('el retorno de Flow usa el dominio real y no el carrito', () => {
  const site = urlSitioDesdeRequest({
    headers: { host: 'www.siiilckventas.com', 'x-forwarded-proto': 'https' }
  });
  assert.equal(site, 'https://www.siiilckventas.com');
  const urls = urlsDePago(site);
  assert.equal(urls.urlReturn, 'https://www.siiilckventas.com/api/retorno');
  assert.equal(urls.urlConfirmation, 'https://www.siiilckventas.com/api/confirm');
  assert.equal(urls.exito, 'https://www.siiilckventas.com/pago/exito');
});

test('los datos de la cuenta solo los ve el comprador con la orden pagada', () => {
  const secreto = datosCuentaDesdeSecreto({
    email_enc: Buffer.from('user@juego.com', 'utf8').toString('base64'),
    pass_enc: Buffer.from('clave-123', 'utf8').toString('base64')
  }, { publicacionId: 'pub1', titulo: 'Valorant', vendedorUid: 'seller' });
  assert.equal(secreto.email, 'user@juego.com');
  assert.equal(secreto.clave, 'clave-123');
  assert.equal(puedeVerDatosCuenta({ paid: true, buyerId: 'buyer', userId: 'buyer' }), true);
  assert.equal(puedeVerDatosCuenta({ paid: false, buyerId: 'buyer', userId: 'buyer' }), false);
  assert.equal(puedeVerDatosCuenta({ paid: true, buyerId: 'buyer', userId: 'otro' }), false);
  const publico = quitarSecretos({ titulo: 'Valorant', email: 'oculto', clave: 'oculta', publicacionId: 'pub1' });
  assert.equal(publico.titulo, 'Valorant');
  assert.equal(publico.email, undefined);
  assert.equal(publico.clave, undefined);
  const deLaPublicacion = datosCuentaDesdeSecreto(
    {
      email_enc: Buffer.from('user@juego.com', 'utf8').toString('base64'),
      pass_enc: Buffer.from('clave-123', 'utf8').toString('base64'),
      tel_enc: Buffer.from('+56911111111', 'utf8').toString('base64')
    },
    { publicacionId: 'pub1', titulo: 'Otro título', vendedorUid: 'seller' },
    { titulo: 'Valorant Radiant', juego: 'Valorant', nivel: 'Radiant', region: 'LATAM' }
  );
  assert.equal(deLaPublicacion.titulo, 'Valorant Radiant');
  assert.equal(deLaPublicacion.juego, 'Valorant');
  assert.equal(deLaPublicacion.telefono, '+56911111111');
});

test('una publicación vendida se elimina recién a las 24 horas', () => {
  const ahora = new Date('2026-10-16T12:00:00Z');
  const hace23h = new Date(ahora.getTime() - (23 * 60 * 60 * 1000));
  const hace24h = new Date(ahora.getTime() - (24 * 60 * 60 * 1000));
  assert.equal(debeEliminarPublicacion({ vendida: true, vendidaEn: hace23h }, ahora), false);
  assert.equal(debeEliminarPublicacion({ vendida: true, vendidaEn: hace24h }, ahora), true);
  assert.equal(debeEliminarPublicacion({ vendida: false, vendidaEn: hace24h }, ahora), false);
  assert.equal(debeEliminarPublicacion({ vendida: true }, ahora), false);
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

test('el monto de Flow sale del servidor e ignora el amount del cliente', () => {
  assert.equal(resolverMontoFlow(null, 99999), 0);
  assert.equal(resolverMontoFlow({ ok: false }, 3558), 0);
  assert.equal(resolverMontoFlow({ ok: true, total: 4760 }, 1), 4760);
  assert.equal(MINIMO_FLOW, 350);
  assert.equal(estadoHttpPago({ ok: false, error: 'Precio inválido' }), 400);
  assert.equal(estadoHttpPago({ ok: false, error: 'Producto no encontrado' }), 404);
  assert.equal(estadoHttpPago({ ok: false, error: 'No autenticado' }), 401);
});

test('el precio cobrado es el de la publicación, no el del carrito', () => {
  const publicacion = { id: 'pub1', titulo: 'Valorant', precio: 10000, stock: 1, vendedorUid: 'seller' };
  const directo = precioCuentaServidor(publicacion, { precio: 1, garantia: 99999 });
  assert.equal(directo.ok, true);
  assert.equal(directo.precioBase, 10000);
  assert.equal(directo.garantia, 0);
  assert.equal(directo.precio, 10000);

  const conGarantia = armarItemCuenta(publicacion, { id: 'linea1', precio: 1, garantia: 2841, cantidadSeleccionada: 1 });
  assert.equal(conGarantia.ok, true);
  assert.equal(conGarantia.item.precio, 12841);
  assert.equal(conGarantia.item.precioBase, 10000);
  assert.equal(conGarantia.item.garantia, 2841);

  const montos = calcularMonto({ items: [conGarantia.item], perfil: {} });
  assert.equal(montos.subtotal, 12841);
  assert.equal(montos.total, 12841 + Math.round(12841 * 0.19));
  assert.equal(precioCuentaServidor({ precio: 0 }).ok, false);
  assert.equal(precioCuentaServidor({ precio: 'no-es-numero' }).error, 'Precio inválido');
  assert.equal(armarItemCuenta({ id: 'x', titulo: 'Agotada', precio: 5000, stock: 0, vendida: true }).ok, false);
});

test('el pago con solo listing_id usa el email de la sesión', () => {
  const soloToken = identidadComprador({
    sesion: { ok: true, uid: 'comprador1', email: 'buyer@siilck.cl' }
  });
  assert.equal(soloToken.ok, true);
  assert.equal(soloToken.uid, 'comprador1');
  assert.equal(soloToken.email, 'buyer@siilck.cl');
  assert.equal(identidadComprador({}).error, 'Falta el email del comprador.');
  const sesionMala = identidadComprador({
    email: 'buyer@siilck.cl',
    sesion: { ok: false, error: 'Sesión inválida o expirada. Vuelve a iniciar sesión.', code: 'sesion_invalida' }
  });
  assert.equal(sesionMala.ok, false);
  assert.equal(sesionMala.code, 'sesion_invalida');
});

test('el carrito y la ficha envían listing_id y no el monto', () => {
  const carrito = readFileSync(new URL('../../carrito.html', import.meta.url), 'utf8');
  const ventas = readFileSync(new URL('../../ventas.html', import.meta.url), 'utf8');
  const index = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const crear = readFileSync(new URL('../../api/crear.js', import.meta.url), 'utf8');
  const orden = readFileSync(new URL('../../api/flow/create-order.js', import.meta.url), 'utf8');
  assert.match(carrito, /\/api\/flow\/create-order/);
  assert.match(carrito, /listing_id/);
  assert.equal(carrito.includes('amount:'), false);
  assert.match(ventas, /JSON\.stringify\(\{ listing_id: publicacionActualIdCache \}\)/);
  assert.match(ventas, /id="btn-pagar-producto"/);
  assert.equal(index.includes('amount:'), false);
  assert.equal(crear.includes('amount: body.amount'), false);
  assert.equal(orden.includes('body.amount'), false);
  assert.match(orden, /listing_id/);
});

test('activar VIP escribe isVip y plan vip en el perfil', () => {
  const campos = camposPerfilVip('pro', new Date('2030-01-01T00:00:00Z'));
  assert.equal(campos.isVip, true);
  assert.equal(campos.plan, 'vip');
  assert.equal(campos.esVendedorVip, true);
  assert.equal(campos.tipoVip, 'pro');
});

test('anonimiza el nombre de la compra para la prueba social', () => {
  assert.equal(anonimizarNombre('juan perez', 'Santiago'), 'Juan de Santiago');
  assert.equal(anonimizarNombre('Matías', 'Maipú'), 'Matías de Maipú');
  assert.equal(anonimizarNombre('', ''), 'Comprador de Santiago');
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
