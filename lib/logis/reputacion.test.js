import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  debeLiberar,
  diasRetencion,
  esEntregaInmediata,
  montoVendedor,
  motivosReclamo,
  normalizarReclamo,
  normalizarResena,
  pasaFiltros,
  puedeRetirar,
  precioLista,
  promedioEstrellas,
  textoEstrellas,
  vendedorDesdeFuentes,
  DIA_MS
} from '../reputacion.js';

function leer(rel) {
  return readFileSync(new URL('../../' + rel, import.meta.url), 'utf8');
}

test('la garantía define cuántos días queda retenido el saldo', () => {
  assert.equal(diasRetencion(0), 10);
  assert.equal(diasRetencion(2841), 90);
  assert.equal(diasRetencion(5682), 180);
  assert.equal(montoVendedor({ tipoItem: 'pase_vip', precioFinal: 9000 }), 0);
  assert.equal(montoVendedor({ precioFinal: 29400, garantia: 2841, precio: 32241, cantidad: 1 }), 29400);
  assert.equal(montoVendedor({ precio: 12000, garantia: 0 }), 12000);
});

test('las estrellas y los filtros usan lo que ve el comprador', () => {
  assert.deepEqual(promedioEstrellas([{ estrellas: 5 }, { estrellas: 4 }, { estrellas: 9 }]), { promedio: 4.5, total: 2 });
  assert.equal(textoEstrellas(4.5, 2), '★★★★★');
  assert.equal(textoEstrellas(0, 0), 'Nuevo');
  assert.equal(esEntregaInmediata({}), true);
  assert.equal(esEntregaInmediata({ entregaInmediata: false }), false);
  const pub = { precio: 32000, ofertaActiva: true, precioFinal: 29400, nivel: 'Diamante', rango: 'Inmortal', region: 'LATAM' };
  assert.equal(precioLista(pub), 29400);
  assert.equal(pasaFiltros(pub, { nivel: 'inmor', region: 'lat', precio: 29400, min: 10000, max: 30000 }), true);
  assert.equal(pasaFiltros(pub, { nivel: 'hierro', precio: 29400 }), false);
  assert.equal(pasaFiltros(pub, { region: 'europa', precio: 29400 }), false);
  assert.equal(pasaFiltros(pub, { precio: 29400, max: 20000 }), false);
});

test('el retiro respeta el mínimo y la retención', () => {
  assert.equal(puedeRetirar({ disponible: 8000 }, 4000).ok, false);
  assert.equal(puedeRetirar({ disponible: 4000 }, 5000).ok, false);
  assert.deepEqual(puedeRetirar({ disponible: 12000 }, 5000), { ok: true, monto: 5000 });
  const ahora = 10 * DIA_MS;
  assert.equal(debeLiberar({ estado: 'retenido', liberaEn: ahora - DIA_MS }, ahora), true);
  assert.equal(debeLiberar({ estado: 'retenido', liberaEn: ahora + DIA_MS }, ahora), false);
  assert.equal(debeLiberar({ estado: 'disponible', liberaEn: ahora - 1 }, ahora), false);
  assert.equal(vendedorDesdeFuentes(
    [{ tipo: 'servicio', vendedorUid: 'vip' }],
    [{ tipoItem: 'cuenta', vendedorUid: 'seller', vendedorNombre: 'Nico', publicacionId: 'p1' }]
  ).vendedorUid, 'seller');
  assert.equal(normalizarResena({ estrellas: 5, comentario: 'Llegó al toque' }).ok, true);
  assert.equal(normalizarResena({ estrellas: 0, comentario: 'hola' }).ok, false);
  assert.equal(normalizarReclamo({ motivo: motivosReclamo()[0], detalle: 'cambiaron el correo' }).ok, true);
  assert.equal(normalizarReclamo({ motivo: 'hack', detalle: 'cambiaron el correo' }).ok, false);
});

test('la ficha, el saldo, la reseña y el reclamo se suman sin cerrar orders', () => {
  const ventas = leer('ventas.html');
  const compras = leer('mis-compras.html');
  const pub = leer('publicacion.html');
  const reglas = leer('firestore.rules');
  const entrega = leer('lib/logis/entrega.js');
  const index = leer('index.html');
  const panel = leer('panel.html');
  assert.match(ventas, /Entrega inmediata/);
  assert.match(ventas, /id="filtro-nivel"/);
  assert.match(ventas, /id="filtro-orden"/);
  assert.match(ventas, /\/cuenta\/\$\{encodeURIComponent\(p\.id\)\}/);
  assert.match(ventas, /Cuentas disponibles/);
  assert.match(ventas, /p\.vendida \|\| stockNum <= 0/);
  assert.match(ventas, /Producto ya se encuentra en el carrito/);
  assert.match(ventas, /idsEnCarrito\.has\(publicacionActualIdCache\)/);
  assert.match(ventas, /absolute bottom-2 left-2 z-10 bg-red-600/);
  assert.match(ventas, /displayName \|\| p\.username/);
  assert.match(ventas, /htmlReputacion\(uidVend, p\)/);
  assert.match(ventas, /\/api\/reputacion/);
  assert.match(ventas, /resenasPromedio/);
  assert.match(ventas, /id="modal-vendedor-reputacion"/);
  const ficha = leer('cuenta.html');
  assert.match(ficha, /Pagar con Flow/);
  assert.match(ficha, /Mercado Pago/);
  assert.match(ficha, /max-w-5xl mx-auto px-4 md:px-6 py-6/);
  assert.match(ficha, /aspect-\[16\/9\] object-contain bg-black rounded-2xl/);
  assert.match(ficha, /data\.displayName \|\| data\.username/);
  assert.match(ficha, /Producto ya se encuentra en el carrito/);
  assert.match(ficha, /\/api\/ficha/);
  assert.match(ficha, /No se pudo cargar la ficha\./);
  assert.match(ficha, /Cuenta no encontrada/);
  assert.match(leer('api/cuenta-pagina.js'), /cuenta\.html/);
  assert.match(leer('vercel.json'), /\/api\/cuenta-pagina/);
  assert.match(leer('lib/logis/comunidad.js'), /copiarResenasEnPublicaciones/);
  assert.match(leer('lib/logis/comunidad.js'), /resenasPromedio|copiarResenasEnPublicaciones/);
  assert.match(leer('carrito.html'), /nuevaCantidad \+ otras > stockMaximo/);
  assert.match(leer('saldo.html'), /\/api\/saldo/);
  assert.match(leer('saldo.html'), /\/api\/retiro/);
  assert.match(leer('saldo.html'), /Se libera el/);
  assert.match(leer('saldo.html'), /destinoRetiro/);
  assert.match(leer('saldo.html'), /btn-usar-banco-guardado/);
  assert.match(compras, /Dejar reseña/);
  assert.match(compras, /copiarDatoCuenta/);
  assert.match(compras, /filtro-compras/);
  assert.match(compras, /mc-linea-tiempo/);
  assert.match(ficha, /otras-cuentas/);
  assert.match(ficha, /cargarOtrasCuentas/);
  assert.match(compras, /Abrir reclamo/);
  assert.match(compras, /\/api\/resena/);
  assert.match(compras, /\/api\/reclamo/);
  assert.match(compras, /Ver datos de mi cuenta/);
  assert.match(pub, /entregaInmediata:true/);
  assert.match(pub, /id="pub-rango"/);
  assert.match(reglas, /match \/resenas\/\{ordenId\}/);
  assert.match(reglas, /match \/saldos\/\{uid\}/);
  assert.match(reglas, /match \/retiros\/\{retiroId\}/);
  assert.match(reglas, /match \/reclamos\/\{ordenId\}/);
  assert.equal(reglas.includes('match /orders/'), false);
  assert.match(entrega, /acreditarVenta/);
  assert.match(entrega, /registrarVenta/);
  assert.match(index, /Mi saldo/);
  assert.match(index, /comprimirFotoPerfil/);
  assert.match(index, /update.avatar_url = avatarBase64/);
  assert.match(index, /update.fotoPerfil = avatarBase64/);
  assert.match(index, /video\/promo-siilck.mp4/);
  assert.match(leer('ventas.html'), /d.fotoPerfil, d.avatar_url, d.avatar, d.foto/);
  assert.match(leer('ventas.html'), /!pData.vendedorRevocado/);
  assert.match(panel, /vendedorRevocado: !nuevoEstado/);
  assert.match(panel, /postuladoFormulario: nuevoEstado/);
  assert.match(pub, /!currentUserData.vendedorRevocado/);
  assert.match(panel, /tab-retiros/);
  assert.match(leer('vercel.json'), /\/cuenta\/:id/);
  assert.match(leer('vercel.json'), /\/vendedor\/:uid/);
  assert.match(leer('lib/logis/ventas-reales.js'), /backfillVentas/);
  assert.match(leer('lib/logis/saldo.js'), /salesCount/);
});
