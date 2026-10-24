import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  idCorto,
  millisDeFecha,
  ordenViejaEsDelUsuario,
  puedeReclamar,
  productosDesdeOrden,
  tipoDeItem
} from './orders.js';

function leer(rel) {
  return readFileSync(new URL('../../' + rel, import.meta.url), 'utf8');
}

test('la orden nueva guarda cuenta, pase y producto sin mezclar las claves', () => {
  const productos = productosDesdeOrden({
    items: [
      { tipoItem: 'cuenta', publicacionId: 'p1', titulo: 'Free Fire', precio: 9600 },
      { tipoItem: 'pase_vip', titulo: 'Pase VIP', precio: 3558 },
      { titulo: 'Servicio extra', precio: 1000 }
    ]
  }, [{
    publicacionId: 'p1',
    titulo: 'Free Fire',
    emailCuenta: 'jugador@juego.com',
    passwordCuenta: 'clave-1'
  }]);
  assert.equal(productos[0].tipo, 'cuenta');
  assert.equal(productos[0].user, 'jugador@juego.com');
  assert.equal(productos[0].pass, 'clave-1');
  assert.equal(productos[0].emailCuenta, 'jugador@juego.com');
  assert.equal(productos[0].juego, '');
  assert.equal(productos[1].tipo, 'servicio');
  assert.equal(productos[1].pass, null);
  assert.equal(productos[1].juego, '');
  assert.equal(productos[2].tipo, 'producto');
  assert.equal(tipoDeItem('pase_vip'), 'servicio');
  assert.equal(tipoDeItem('cuenta'), 'cuenta');
});

test('la compra muestra de que juego es la cuenta', () => {
  const porItem = productosDesdeOrden({
    items: [{ tipoItem: 'cuenta', publicacionId: 'p1', titulo: 'Cuenta ranked', juego: 'Free Fire', precio: 9600 }]
  }, []);
  assert.equal(porItem[0].juego, 'Free Fire');
  const porMapa = productosDesdeOrden({
    items: [{ tipoItem: 'cuenta', publicacionId: 'p2', titulo: 'Cuenta skins', precio: 5000 }]
  }, [], new Map([['p2', 'Fortnite']]));
  assert.equal(porMapa[0].juego, 'Fortnite');
  const porPrivada = productosDesdeOrden({
    items: [{ tipoItem: 'cuenta', publicacionId: 'p3', titulo: 'Cuenta stream', precio: 4000 }]
  }, [{ publicacionId: 'p3', juego: 'Disney+', emailCuenta: 'a@b.cl', passwordCuenta: 'x' }]);
  assert.equal(porPrivada[0].juego, 'Disney+');
  assert.equal(porPrivada[0].tipo, 'cuenta');
});

test('solo se reclama una compra sin uid y del mismo email', () => {
  assert.equal(puedeReclamar({ uid: null, email: 'a@b.cl' }, { uid: 'u1', email: 'A@b.cl' }), true);
  assert.equal(puedeReclamar({ uid: 'otro', email: 'a@b.cl' }, { uid: 'u1', email: 'a@b.cl' }), false);
  assert.equal(puedeReclamar({ uid: null, email: 'otro@b.cl' }, { uid: 'u1', email: 'a@b.cl' }), false);
  assert.equal(puedeReclamar({ uid: null, email: 'a@b.cl' }, { uid: '', email: 'a@b.cl' }), false);
});

test('las compras viejas pagadas se copian solo si son del usuario', () => {
  const pagada = { compradorUid: 'u1', email: 'a@b.cl', paid: true, estado: 'entregado' };
  assert.equal(ordenViejaEsDelUsuario(pagada, { uid: 'u1', email: 'a@b.cl' }), true);
  assert.equal(ordenViejaEsDelUsuario(pagada, { uid: 'u2', email: 'a@b.cl' }), false);
  assert.equal(ordenViejaEsDelUsuario({ email: 'a@b.cl', paid: true }, { uid: 'u1', email: 'a@b.cl' }), true);
  assert.equal(ordenViejaEsDelUsuario({ compradorUid: 'u1', paid: false, estado: 'pendiente' }, { uid: 'u1', email: 'a@b.cl' }), false);
  assert.equal(idCorto('SIIILCK-abcdefgh-123'), 'efgh-123'.slice(-8));
  assert.equal(millisDeFecha({ seconds: 10 }), 10000);
});

test('el menu abre Mis compras y el detalle de una orden sigue igual', () => {
  const index = leer('index.html');
  const login = leer('login.html');
  const pagina = leer('mis-compras.html');
  const flow = leer('lib/logis/pagos.js');
  const mp = leer('lib/logis/mercadopago.js');
  const reglas = leer('firestore.rules');
  assert.match(index, /Mis compras/);
  assert.match(index, /\/login\?next=\/mis-compras/);
  assert.match(login, /get\('next'\)/);
  assert.match(pagina, /Datos de tu cuenta/);
  assert.match(pagina, /\/api\/compra\?datos=1/);
  assert.match(pagina, /Ver datos de mi cuenta/);
  assert.match(pagina, /item\.juego/);
  assert.match(pagina, /\/api\/orders/);
  assert.match(pagina, /ID transacción/);
  assert.match(pagina, /EN GARANTÍA ESCROW/);
  assert.match(pagina, /Ver credenciales/);
  assert.match(pagina, /Explorar más/);
  assert.match(index, /id="sv-cortina-trabaja"/);
  assert.match(index, /id="btn-trabaja-con-nosotros"/);
  assert.match(index, /mouseleave/);
  assert.equal(index.includes('id="gDots1"'), false);
  assert.match(index, /class="g-arrow left"/);
  assert.match(login, /sendPasswordResetEmail/);
  assert.match(login, /href="\/recuperar"/);
  assert.match(login, /verificadoForzado/);
  assert.match(login, /from=google/);
  assert.match(leer('recuperar.html'), /sendPasswordResetEmail/);
  assert.match(leer('recuperar.html'), /unauthorized-continue-uri/);
  assert.match(leer('recuperar.html'), /Enviar link real/);
  assert.match(login, /unauthorized-continue-uri/);
  assert.match(leer('recuperar-contrasena.html'), /\/recuperar/);
  assert.match(index, /id="vip-overlay"/);
  assert.match(index, /translate-x-full/);
  assert.match(index, /btn-pagar-vip-basico"/);
  assert.match(index, /btn-pagar-vip-pro-mp"/);
  assert.match(login, /signInWithRedirect/);
  assert.match(login, /getRedirectResult/);
  assert.match(login, /sendEmailVerification/);
  assert.match(login, /Verifica tu correo para poder ingresar/);
  assert.match(login, /emailVerified/);
  assert.match(leer('guardia.js'), /verificar-correo/);
  assert.match(leer('vercel.json'), /\/verificar-correo/);
  assert.match(leer('vercel.json'), /"redirects"/);
  assert.match(leer('verificar-correo.html'), /vista=verificar/);
  assert.match(leer('verificar-correo.html'), /\/login/);
  assert.match(flow, /registrarEnOrders\(commerceOrder, 'flow'\)/);
  assert.match(flow, /guardarOrdenPagada\(commerceOrder, metodo\)/);
  assert.match(flow, /entregarCuentas/);
  assert.match(flow, /status !== 2/);
  assert.match(mp, /guardarOrdenPagada\(commerceOrder, 'mercadopago'\)/);
  assert.match(mp, /=== 'approved'/);
  assert.match(reglas, /match \/ordenes\/\{ordenId\}/);
  assert.equal(reglas.includes('match /orders/'), false);
});
