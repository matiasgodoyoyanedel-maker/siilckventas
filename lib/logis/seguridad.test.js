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
  assert.match(limpia, /CRON_SECRET/);
  assert.match(limpia, /x-vercel-cron/);
});

test('el marketplace destaca el título y el carrusel marca la carta central', () => {
  const ventas = leer('ventas.html');
  const index = leer('index.html');
  const games = leer('lib/gamesList.js');
  assert.match(ventas, /sv-mcard-titulo/);
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
  const ventas = leer('ventas.html');
  assert.match(carrito, /sv-cart-page/);
  assert.match(carrito, /sv-cart-item/);
  assert.match(carrito, /id="btn-pagar-flow"/);
  assert.match(carrito, /id="btn-pagar-mp"/);
  assert.match(carrito, /pagarConFlow\(/);
  assert.match(carrito, /\/api\/flow\/create/);
  assert.match(carrito, /Seguir comprando/);
  assert.match(carrito, /Vaciar carrito/);
  assert.match(carrito, /El pago queda en escrow/);
  assert.match(carrito, /function vaciarCarrito/);
  assert.equal(js.includes('sv-sk-watermark'), false);
  assert.equal(tema.includes('sv-sk-watermark'), false);
  assert.equal(tema.includes('Great Vibes'), false);
  assert.match(tema, /STOREFRONT/);
  assert.match(tema, /#f5f6f8/);
  assert.match(tema, /\.sv-mcard-media/);
  assert.match(tema, /card-vip-pro-glow/);
  assert.match(tema, /estelaVipPro/);
  assert.match(tema, /pase-ribbon/);
  assert.match(ventas, /card-vip-pro-glow/);
  assert.match(ventas, /VIP Pro/);
  assert.match(ventas, /impulsarPublicacion/);
});

test('el foro y el chat no pintan HTML crudo', () => {
  const foro = leer('foro.html');
  const ventas = leer('ventas.html');
  const index = leer('index.html');
  const reglas = leer('firestore.rules');
  assert.match(foro, /escHtml\(t\.titulo\)/);
  assert.match(foro, /escHtml\(t\.contenido\)/);
  assert.match(ventas, /escHtml\(m\.texto\)/);
  assert.match(ventas, /escHtml\(p\.juego\)/);
  assert.match(ventas, /function cerrarChatP2PDefinitivo/);
  assert.match(ventas, /Solo el vendedor puede cerrar el chat/);
  assert.match(ventas, /Chats abiertos/);
  assert.match(ventas, /Chats cerrados/);
  assert.match(ventas, /nombrePerfilChat/);
  assert.match(ventas, /ultimoTexto/);
  assert.match(ventas, /marcarChatLeido/);
  assert.match(ventas, /htmlSelloVendedor/);
  assert.match(ventas, /compartirWhatsAppFicha/);
  assert.match(ventas, /chat-link-cuenta/);
  assert.match(ventas, /sv-pasos-clave/);
  assert.match(index, /Chats abiertos/);
  assert.match(index, /sv-pasos-compra/);
  assert.match(index, /perfil-vista-publica/);
  assert.match(index, /pintarVistaPublicaPerfil/);
  assert.match(index, /nombrePerfilLista/);
  assert.match(index, /vendedor\.html\?uid=/);
  assert.match(index, /Ver mi perfil/);
  assert.match(index, /Chats cerrados/);
  assert.match(reglas, /chatDoc\(\)\.chatCerrado != true/);
  assert.match(reglas, /resource.data.vendedorUid != request.auth.uid/);
});

test('fotos de catalogo, filtros movil, sello fijo y edicion de dueño', () => {
  const games = leer('lib/gamesList.js');
  const ventas = leer('ventas.html');
  const pub = leer('publicacion.html');
  const social = leer('social.js');
  const tema = leer('tema.css');
  assert.match(games, /siilckFotoCatalogo/);
  assert.match(games, /siilckCatalogoJuego/);
  assert.match(games, /id: "capcut"/);
  assert.match(games, /img\/games\/youtube-classic\.svg/);
  assert.match(ventas, /fotoDePublicacion/);
  assert.match(ventas, /siilckFotoCatalogo/);
  assert.match(ventas, /publicacion\.html\?editar=/);
  assert.match(ventas, /grid-cols-1 sm:grid-cols-2 md:grid-cols-5/);
  assert.match(ventas, /object-cover/);
  assert.match(pub, /editandoId/);
  assert.match(pub, /cargarEdicionPublicacion/);
  assert.match(pub, /fotoCatalogoActual/);
  assert.match(pub, /Solo el dueño/);
  assert.match(social, /sv-sello-moved/);
  assert.match(social, /--sv-sello-x/);
  assert.match(tema, /sv-sello-moved/);
  assert.match(tema, /object-fit: cover/);
  assert.match(tema, /#filtros-extra #filtro-orden/);
  assert.match(tema, /NAVY \+ ÁMBAR/);
  assert.match(tema, /ESTILO DEFINITIVO/);
  assert.match(tema, /TEMÁTICA NEÓN/);
  assert.match(tema, /\.sv-market-head/);
  assert.match(tema, /#fde68a/);
  assert.match(tema, /#sv-locale-btn/);
  assert.match(tema, /#nav-user-email/);
  assert.match(tema, /#sv-cart-hero-title/);
  assert.match(tema, /\.sv-locale-panel button/);
  const settings = leer('lib/settings.js');
  assert.match(settings, /#sv-locale-btn/);
  assert.match(settings, /#111827/);
  assert.match(settings, /#0f172a/);
  const carrito = leer('carrito.html');
  assert.match(carrito, /sv-cart-hero-title/);
  const index = leer('index.html');
  assert.match(index, /sv-store-nav/);
  assert.match(index, /sv-beneficios/);
  assert.match(index, /sv-hero-kicker/);
  assert.match(index, /gameShowcase1/);
  assert.match(index, /gameShowcase2/);
  assert.match(index, /welcome-btn/);
  assert.match(index, /sv-pasos-compra/);
  assert.match(index, /faq-inicio/);
});
