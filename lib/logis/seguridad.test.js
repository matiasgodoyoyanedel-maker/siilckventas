import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function leer(rel) {
  return readFileSync(new URL('../../' + rel, import.meta.url), 'utf8');
}

test('el checkout exige token y no publica sin vendedor aprobado', () => {
  const validacion = leer('lib/logis/validacion.js');
  const reglas = leer('firestore.rules');
  const mp = leer('api/mp/create.js');
  const flow = leer('api/flow/create.js');
  const crear = leer('api/crear.js');
  const limpia = leer('api/limpiar-vendidas.js');
  assert.match(validacion, /if \(!idToken\) return \{ ok: false, error: 'Debes iniciar sesión para comprar\.' \}/);
  assert.match(mp, /Debes iniciar sesión para comprar/);
  assert.match(flow, /Debes iniciar sesión para comprar/);
  assert.match(crear, /Debes iniciar sesión para comprar/);
  assert.match(reglas, /'role', 'esAdmin', 'is_seller'/);
  assert.match(reglas, /vendedorAprobado/);
  assert.match(reglas, /match \/avisos_ofertas\/\{avisoId\}/);
  assert.match(reglas, /match \/configuracion\/\{docId\}/);
  assert.match(reglas, /match \/users\/\{userId\}/);
  assert.match(limpia, /CRON_SECRET/);
  assert.match(limpia, /x-vercel-cron/);
});

test('el marketplace destaca el título y el carrusel marca la carta central', () => {
  const ventas = leer('ventas.html');
  const index = leer('index.html');
  const games = leer('lib/gamesList.js');
  assert.match(ventas, /sv-mcard-titulo/);
  assert.match(ventas, /\.sv-mcard\.card-vip-basico-glow\{border:2px solid #f59e0b !important/);
  assert.match(ventas, /\.sv-mcard\.card-vip-pro-glow\{border:2px solid #ef4444 !important/);
  assert.match(ventas, /Marketplace de Cuentas Activas/);
  assert.match(ventas, /impulsarPublicacion/);
  assert.match(ventas, /htmlEntregaInmediata/);
  assert.match(index, /is-center/);
  assert.match(index, /perspective\(820px\)/);
  assert.match(index, /id="faq-inicio"/);
  assert.match(index, /sv-faq-q/);
  assert.match(index, /aria-expanded/);
  assert.match(index, /#070d18/);
  assert.match(games, /img\/games\/apex\.webp/);
  games.split('{ id:').forEach((bloque) => {
    if (bloque.includes('categoria: "juego"')) {
      assert.equal(bloque.includes('images.pexels.com'), false);
    }
  });
});

test('el carrito se pule sin tocar el pago y no hay marca SK', () => {
  const carrito = leer('carrito.html');
  const tema = leer('tema.css');
  const js = leer('tema.js');
  assert.match(carrito, /sv-cart-page/);
  assert.match(carrito, /sv-cart-item/);
  assert.match(carrito, /id="btn-pagar-flow"/);
  assert.match(carrito, /id="btn-pagar-mp"/);
  assert.match(carrito, /pagarConFlow\(/);
  assert.match(carrito, /\/api\/flow\/create/);
  assert.equal(js.includes('sv-sk-watermark'), false);
  assert.equal(tema.includes('sv-sk-watermark'), false);
  assert.equal(tema.includes('Great Vibes'), false);
  assert.equal(js.includes('sv-page-loader'), false);
  assert.equal(js.includes('ensurePageLoader'), false);
  assert.equal(tema.includes('#sv-page-loader'), false);
  assert.match(tema, /\.sv-mcard\.card-vip-basico-glow/);
  assert.match(tema, /\.sv-mcard\.card-vip-pro-glow/);
});

test('Google no se queda en login y el perfil guarda idioma y moneda', () => {
  const login = leer('login.html');
  const settings = leer('lib/settings.js');
  assert.match(login, /necesitaRedirectGoogle/);
  assert.match(login, /signInWithPopup/);
  assert.match(login, /signInWithRedirect/);
  assert.match(login, /destinoSeguroDe/);
  assert.match(login, /function entrarConGoogle/);
  assert.match(login, /guardarPerfilGoogle/);
  assert.match(login, /if\(esGoogle\(usuarioActual\)\)/);
  assert.match(login, /if\(u && esGoogle\(u\)\)\{\s*entrarConGoogle\(u\);/);
  assert.match(login, /if\(google\)\{\s*await entrarConGoogle\(user\);/);
  assert.match(login, /if\(esGoogle\(user\)\) return true;/);
  assert.match(login, /resolverIngreso/);
  assert.match(login, /verificadoForzado/);
  assert.match(login, /async function registrarUsuarioEmail/);
  assert.match(login, /async function enviarRecuperacion/);
  assert.match(login, /sendEmailVerification\(opcionesCorreo\(\)\)/);
  assert.match(login, /await auth.signOut\(\);\s*irAVerificar\(cred.user.email \|\| e\);/);
  assert.match(settings, /ajustes: \{ language: state.language, currency: state.currency \}/);
  assert.match(settings, /escucharPerfilAjustes/);
});

test('el admin publica avisos de ofertas sin quitar las otras pestañas', () => {
  const panel = leer('panel.html');
  const index = leer('index.html');
  const reglas = leer('firestore.rules');
  assert.match(panel, /cambiarTabAdmin\('avisos'\)/);
  assert.match(panel, /id="tab-avisos"/);
  assert.match(panel, /id="tab-postulaciones"/);
  assert.match(panel, /id="tab-usuarios"/);
  assert.match(panel, /id="tab-mantenimiento"/);
  assert.match(panel, /id="tab-retiros"/);
  assert.match(panel, /guardarAvisoOferta/);
  assert.match(panel, /avisos_ofertas/);
  assert.match(panel, /avisosOfertas/);
  assert.match(panel, /configuracion'\).doc\('avisosOfertas'\)/);
  assert.match(panel, /maintenance_mode/);
  assert.match(index, /id="avisos-ofertas"/);
  assert.match(index, /id="sv-aviso-portada"/);
  assert.match(index, /sv_aviso_visto_/);
  assert.match(index, /avisosOfertas/);
  assert.match(panel, /el que tú quieras/);
  assert.match(panel, /Escribe cualquier título, no solo el nombre del juego/);
  assert.match(reglas, /match \/avisos_ofertas\/\{avisoId\}/);
  assert.match(reglas, /match \/configuracion\/\{docId\}/);
  assert.match(reglas, /allow write: if isOwner\(\)/);
  assert.match(reglas, /match \/users\/\{userId\}/);
});

test('el foro y el chat no pintan HTML crudo', () => {
  const foro = leer('foro.html');
  const ventas = leer('ventas.html');
  assert.match(foro, /escHtml\(t\.titulo\)/);
  assert.match(foro, /escHtml\(t\.contenido\)/);
  assert.match(ventas, /escHtml\(m\.texto\)/);
  assert.match(ventas, /escHtml\(p\.juego\)/);
});
