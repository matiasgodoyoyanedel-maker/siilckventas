import { authAdmin, getDb } from './db.js';
import { preciosPaseVipDesdeConfig } from './precios.js';
import { hayStock } from './stock.js';

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
    try {
      const decoded = await authAdmin().verifyIdToken(idToken);
      uidFinal = decoded.uid;
      if (decoded.email && validarEmail(decoded.email).ok) {
        mail.emailOriginal = decoded.email;
        mail.email = validarEmail(decoded.email).email;
      }
    } catch {
      return { ok: false, error: 'Sesión inválida o expirada. Vuelve a iniciar sesión.' };
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

export async function validarCompra({ uid, email, idToken, tipoVipPase } = {}) {
  const usuario = await verificarUsuario({ uid, email, idToken });
  if (!usuario.ok) return usuario;

  const db = getDb();
  const perfilSnap = await db.collection('perfiles').doc(usuario.uid).get();
  const perfil = perfilSnap.exists ? perfilSnap.data() : {};
  if (perfil.bloqueado) return { ok: false, error: 'Tu cuenta está bloqueada. No puedes comprar.' };

  const config = await cargarConfigGlobal(db);
  if (tipoVipPase === 'basico' || tipoVipPase === 'pro') {
    return {
      ok: true,
      uid: usuario.uid,
      email: usuario.email,
      perfil,
      items: [armarItemPaseVip(tipoVipPase, config)],
      origen: 'pase_vip'
    };
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

    const pubSnap = await db.collection('publicaciones').doc(publicacionId).get();
    if (!pubSnap.exists) return { ok: false, error: `La publicación ${publicacionId} ya no existe.` };
    const publicacion = { id: pubSnap.id, ...pubSnap.data() };

    const cantidad = Math.max(1, parseInt(linea.cantidadSeleccionada || linea.cantidad || 1, 10));
    if (!hayStock(publicacion, cantidad)) {
      return { ok: false, error: `"${publicacion.titulo || linea.titulo}" no tiene stock suficiente.` };
    }

    const precioBase = Number(publicacion.precio || 0);
    const garantiaBruta = Number(linea.garantia ?? (Number(linea.precio || 0) - precioBase));
    const garantia = [0, 2841, 5682].includes(garantiaBruta) ? garantiaBruta : 0;
    const precioCarrito = Number(linea.precio || (precioBase + garantia));

    items.push({
      tipoItem: 'cuenta',
      carritoItemId: linea.id,
      publicacionId,
      titulo: publicacion.titulo || linea.titulo || 'Cuenta',
      foto: publicacion.foto || linea.foto || '',
      vendedorUid: publicacion.vendedorUid || '',
      vendedorNombre: publicacion.vendedorNombre || '',
      precio: precioCarrito,
      precioBase,
      garantia,
      cantidad,
      stock: Number(publicacion.stock ?? 1)
    });
  }

  return {
    ok: true,
    uid: usuario.uid,
    email: usuario.email,
    perfil,
    items
  };
}
