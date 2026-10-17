import { getDb } from './db.js';
import { getOferta } from '../oferta.js';
import { GARANTIAS_PERMITIDAS, precioRealDocumento, precioVipGuardado, preciosPaseVipDesdeConfig } from './precios.js';
import { verificarTokenSesion } from './sesion.js';
import { cantidadSuperaStock, cuentaEstaDisponible, hayStock } from './stock.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validarEmail(email) {
  if (!email || typeof email !== 'string') {
    return { ok: false, error: 'Falta el email del comprador.' };
  }
  const normalizado = email.trim().toLowerCase();
  if (!EMAIL_RE.test(normalizado)) {
    return { ok: false, error: 'El email no es válido.' };
  }
  return { ok: true, email: normalizado, emailOriginal: email.trim() };
}

export async function verificarUsuario({ uid, email, idToken }) {
  const mail = validarEmail(email);
  if (!mail.ok) return mail;

  let uidFinal = uid;
  if (idToken) {
    const sesion = await verificarTokenSesion(idToken);
    if (!sesion.ok) return sesion;
    uidFinal = sesion.uid;
    if (sesion.email && validarEmail(sesion.email).ok) {
      mail.emailOriginal = sesion.email;
      mail.email = validarEmail(sesion.email).email;
    }
  }
  if (!uidFinal) return { ok: false, error: 'Debes iniciar sesión para comprar.' };
  if (uid && uidFinal !== uid) return { ok: false, error: 'La sesión no coincide con el comprador.' };

  return { ok: true, uid: uidFinal, email: mail.emailOriginal || mail.email, emailNormalizado: mail.email };
}

export async function cargarCarrito(uid) {
  const db = getDb();
  const snap = await db.collection('carritos').doc(uid).collection('items').get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function cargarConfigGlobal(db = getDb()) {
  const snap = await db.collection('configuracion').doc('global').get();
  return snap.exists ? snap.data() : {};
}

export function armarItemPaseVip(tipoVipPase, config = {}, extra = {}) {
  const tipo = tipoVipPase === 'pro' ? 'pro' : 'basico';
  const precios = preciosPaseVipDesdeConfig(config);
  const precio = tipo === 'pro' ? precios.pro : precios.basico;
  return {
    tipoItem: 'pase_vip',
    tipoVipPase: tipo,
    carritoItemId: extra.carritoItemId || '',
    publicacionId: '',
    titulo: extra.titulo || (tipo === 'pro' ? 'Pase VIP Pro (30 días)' : 'Pase VIP Básico (30 días)'),
    precio,
    precioBase: precio,
    garantia: 0,
    cantidad: 1,
    stock: 1
  };
}

export async function buscarPublicacion(db, id) {
  const limpio = String(id || '').trim();
  if (!limpio) return null;
  for (const nombre of ['publicaciones', 'listings', 'publications']) {
    const snap = await db.collection(nombre).doc(limpio).get();
    if (snap.exists) return { id: snap.id, ...snap.data() };
  }
  return null;
}

export function itemDesdePublicacion(publicacion, linea = {}) {
  const precio = precioRealDocumento(publicacion);
  if (!precio.ok) return precio;
  const oferta = getOferta(precio.amount, publicacion);
  const precioCobro = oferta && oferta.ahora >= 1 ? oferta.ahora : precio.amount;
  const cantidad = Math.max(1, parseInt(linea.cantidadSeleccionada || linea.cantidad || 1, 10) || 1);
  if (!cuentaEstaDisponible(publicacion) || !hayStock(publicacion, cantidad)) {
    return { ok: false, error: `"${publicacion.titulo || publicacion.title || 'Cuenta'}" ya no está disponible.` };
  }
  const garantiaBruta = Math.round(Number(linea.garantia ?? linea.garantiaCosto ?? 0));
  const garantia = GARANTIAS_PERMITIDAS.includes(garantiaBruta) ? garantiaBruta : 0;
  return {
    ok: true,
    item: {
      tipoItem: 'cuenta',
      carritoItemId: linea.id || '',
      publicacionId: publicacion.id,
      titulo: publicacion.titulo || publicacion.title || linea.titulo || 'Cuenta',
      juego: publicacion.juego || linea.juego || '',
      foto: publicacion.foto || linea.foto || '',
      vendedorUid: publicacion.vendedorUid || '',
      vendedorNombre: publicacion.vendedorNombre || '',
      precio: precioCobro + garantia,
      precioBase: precio.amount,
      precioFinal: precioCobro,
      ofertaActiva: !!(publicacion && publicacion.ofertaActiva),
      ofertaDescuento: oferta ? oferta.descuento : 0,
      garantia,
      cantidad,
      stock: Number(publicacion.stock ?? 1)
    }
  };
}

export async function validarCompra({ uid, email, idToken, tipoVipPase, listingId } = {}) {
  const usuario = await verificarUsuario({ uid, email, idToken });
  if (!usuario.ok) return usuario;

  const db = getDb();
  const perfilSnap = await db.collection('perfiles').doc(usuario.uid).get();
  const perfil = perfilSnap.exists ? perfilSnap.data() : {};
  if (perfil.bloqueado || perfil.is_blocked) return { ok: false, error: 'Tu cuenta está bloqueada. No puedes comprar.' };

  const config = await cargarConfigGlobal(db);
  if (tipoVipPase === 'basico' || tipoVipPase === 'pro') {
    const guardado = precioVipGuardado(config, tipoVipPase);
    if (!guardado.ok) return guardado;
    return {
      ok: true,
      uid: usuario.uid,
      email: usuario.email,
      perfil,
      items: [armarItemPaseVip(tipoVipPase, config)],
      origen: 'pase_vip'
    };
  }

  const idLista = String(listingId || '').trim();
  if (idLista) {
    const publicacion = await buscarPublicacion(db, idLista);
    if (!publicacion) return { ok: false, error: 'Publicación no encontrada' };
    const carrito = await cargarCarrito(usuario.uid);
    const lineas = carrito.filter((linea) => linea.publicacionId === idLista && linea.tipoItem !== 'pase_vip');
    const lineasCobro = lineas.length ? lineas : [{ cantidadSeleccionada: 1, garantia: 0 }];
    const items = [];
    for (const linea of lineasCobro) {
      const armado = itemDesdePublicacion(publicacion, linea);
      if (!armado.ok) return armado;
      items.push(armado.item);
    }
    const tope = cantidadSuperaStock(items);
    if (!tope.ok) return tope;
    return { ok: true, uid: usuario.uid, email: usuario.email, perfil, items, origen: 'listing' };
  }

  const carrito = await cargarCarrito(usuario.uid);
  if (!carrito.length) return { ok: false, error: 'Tu carrito está vacío.' };

  const items = [];
  for (const linea of carrito) {
    if (linea.tipoItem === 'pase_vip') {
      items.push(armarItemPaseVip(linea.tipoVipPase, config, {
        carritoItemId: linea.id,
        titulo: linea.titulo
      }));
      continue;
    }

    const publicacionId = linea.publicacionId;
    if (!publicacionId) return { ok: false, error: `El item "${linea.titulo || linea.id}" no tiene publicación.` };

    const publicacion = await buscarPublicacion(db, publicacionId);
    if (!publicacion) return { ok: false, error: 'Publicación no encontrada' };
    const armado = itemDesdePublicacion(publicacion, linea);
    if (!armado.ok) return armado;
    items.push(armado.item);
  }

  const tope = cantidadSuperaStock(items);
  if (!tope.ok) return tope;

  return {
    ok: true,
    uid: usuario.uid,
    email: usuario.email,
    perfil,
    items
  };
}
