import { FieldValue, getDb } from './db.js';
import { estaPagada } from './entrega.js';

export function tipoDeItem(tipo) {
  const t = String(tipo || '').toLowerCase();
  if (t === 'cuenta' || t === 'producto' || t === 'servicio') return t;
  if (t === 'pase_vip' || t === 'vip') return 'servicio';
  return 'producto';
}

export function puedeReclamar(doc, { uid, email } = {}) {
  if (!doc || !uid || !email) return false;
  if (doc.uid) return false;
  return String(doc.email || '').trim().toLowerCase() === String(email).trim().toLowerCase();
}

export function ordenViejaEsDelUsuario(orden, { uid, email } = {}) {
  if (!orden || !estaPagada(orden)) return false;
  const dueno = String(orden.compradorUid || orden.buyer_id || '');
  if (dueno && uid && dueno === uid) return true;
  if (dueno) return false;
  const correo = String(orden.email || '').trim().toLowerCase();
  return !!email && correo === String(email).trim().toLowerCase();
}

function juegoDe(item, cuenta, juegos) {
  const propio = String(item?.juego || cuenta?.juego || '').trim();
  if (propio) return propio;
  const id = String(item?.publicacionId || cuenta?.publicacionId || '');
  if (id && juegos && typeof juegos.get === 'function') return String(juegos.get(id) || '').trim();
  return '';
}

export function productosDesdeOrden(orden, cuentas, juegos) {
  const porPub = new Map();
  for (const cuenta of cuentas || []) {
    if (cuenta && cuenta.publicacionId) porPub.set(cuenta.publicacionId, cuenta);
  }
  const lineas = orden?.items || [];
  if (!lineas.length) {
    return (cuentas || []).map((cuenta) => ({
      nombre: cuenta.titulo || 'Cuenta',
      tipo: 'cuenta',
      precio: 0,
      juego: juegoDe(null, cuenta, juegos),
      user: cuenta.emailCuenta || null,
      pass: cuenta.passwordCuenta || null,
      emailCuenta: cuenta.emailCuenta || null
    }));
  }
  return lineas.map((item) => {
    const vip = item.tipoItem === 'pase_vip';
    const cuenta = porPub.get(item.publicacionId) || {};
    const esCuenta = !vip && !!item.publicacionId;
    return {
      nombre: item.titulo || cuenta.titulo || (vip ? 'Pase VIP' : 'Producto'),
      tipo: vip ? 'servicio' : (esCuenta ? 'cuenta' : 'producto'),
      precio: Number(item.precio ?? item.precioBase ?? 0) || 0,
      juego: juegoDe(item, cuenta, juegos),
      user: esCuenta ? (cuenta.emailCuenta || null) : null,
      pass: esCuenta ? (cuenta.passwordCuenta || null) : null,
      emailCuenta: esCuenta ? (cuenta.emailCuenta || null) : null
    };
  });
}

async function juegosPorPublicacion(db, orderId, orden, cuentas) {
  const mapa = new Map();
  const poner = (id, juego) => {
    const clave = String(id || '').trim();
    const nombre = String(juego || '').trim();
    if (clave && nombre && !mapa.has(clave)) mapa.set(clave, nombre);
  };
  try {
    for (const cuenta of cuentas || []) poner(cuenta.publicacionId, cuenta.juego);
    if (orderId) {
      const privada = await db.collection('compras_privadas').doc(String(orderId)).get();
      const datos = privada.exists ? ((privada.data() || {}).datosCuenta || []) : [];
      for (const dato of datos) poner(dato.publicacionId, dato.juego);
    }
    const ids = new Set();
    for (const item of orden?.items || []) {
      if (item?.publicacionId && !String(item.juego || '').trim() && !mapa.get(item.publicacionId)) ids.add(item.publicacionId);
    }
    for (const id of ids) {
      const pub = await db.collection('publicaciones').doc(id).get();
      if (pub.exists) poner(id, (pub.data() || {}).juego);
    }
  } catch (e) {
    return mapa;
  }
  return mapa;
}

async function rellenarJuegos(orderRef, productos) {
  try {
    const snap = await orderRef.collection('items').get();
    const pendientes = (productos || []).filter((p) => p && p.juego);
    for (const doc of snap.docs) {
      const d = doc.data() || {};
      if (d.juego) continue;
      const idx = pendientes.findIndex((p) => (p.nombre || 'Producto') === (d.nombre || 'Producto') && tipoDeItem(p.tipo) === tipoDeItem(d.tipo));
      if (idx < 0) continue;
      await doc.ref.update({ juego: String(pendientes[idx].juego) });
      pendientes.splice(idx, 1);
    }
  } catch (e) {}
}

export function millisDeFecha(valor) {
  if (!valor) return 0;
  if (typeof valor.toDate === 'function') return valor.toDate().getTime();
  if (typeof valor.seconds === 'number') return valor.seconds * 1000;
  if (typeof valor._seconds === 'number') return valor._seconds * 1000;
  if (typeof valor === 'number') return valor;
  const t = Date.parse(String(valor));
  return Number.isNaN(t) ? 0 : t;
}

export function idCorto(id) {
  const texto = String(id || '');
  return texto.length <= 8 ? texto : texto.slice(-8);
}

export async function guardarOrden({ email, uid, total, metodo, productos, orderId, createdAt } = {}) {
  const id = String(orderId || '').trim();
  if (!id) return { ok: false, error: 'Falta la orden.' };
  const db = getDb();
  const orderRef = db.collection('orders').doc(id);
  const ya = await orderRef.get();
  if (ya.exists) {
    await rellenarJuegos(orderRef, productos);
    return { ok: true, id, ya: true };
  }
  const correo = String(email || '').trim().toLowerCase();
  await orderRef.set({
    uid: uid || null,
    email: correo,
    total: Number(total) || 0,
    metodo: metodo === 'mercadopago' ? 'mercadopago' : 'flow',
    status: 'pagado',
    createdAt: createdAt || FieldValue.serverTimestamp()
  });
  for (const p of productos || []) {
    await orderRef.collection('items').add({
      nombre: p.nombre || 'Producto',
      tipo: tipoDeItem(p.tipo),
      precio: Number(p.precio) || 0,
      juego: String(p.juego || ''),
      account_user: p.user || null,
      account_pass: p.pass || null,
      account_email: p.emailCuenta || null,
      createdAt: FieldValue.serverTimestamp()
    });
  }
  return { ok: true, id };
}

export async function guardarOrdenPagada(commerceOrder, metodo) {
  const id = String(commerceOrder || '').trim();
  if (!id) return { ok: false };
  const db = getDb();
  const ordenSnap = await db.collection('ordenes').doc(id).get();
  if (!ordenSnap.exists) return { ok: false };
  const orden = ordenSnap.data() || {};
  const entrega = await db.collection('entregas').doc(id).get();
  const cuentas = entrega.exists ? (entrega.data().cuentas || []) : [];
  const medio = metodo === 'mercadopago' || orden.metodoPago === 'mercadopago' ? 'mercadopago' : 'flow';
  const juegos = await juegosPorPublicacion(db, id, orden, cuentas);
  return guardarOrden({
    orderId: id,
    email: orden.email,
    uid: orden.compradorUid || orden.buyer_id || null,
    total: orden.montos?.total || 0,
    metodo: medio,
    productos: productosDesdeOrden(orden, cuentas, juegos)
  });
}

async function copiarPagadas(db, { uid, email }) {
  const ids = new Set();
  if (uid) {
    const porUid = await db.collection('ordenes').where('compradorUid', '==', uid).get();
    porUid.forEach((doc) => ids.add(doc.id));
  }
  if (email) {
    const porEmail = await db.collection('ordenes').where('email', '==', email).get();
    porEmail.forEach((doc) => ids.add(doc.id));
  }
  for (const id of ids) {
    const snap = await db.collection('ordenes').doc(id).get();
    if (!snap.exists) continue;
    const orden = snap.data() || {};
    if (!ordenViejaEsDelUsuario(orden, { uid, email })) continue;
    const entrega = await db.collection('entregas').doc(id).get();
    const cuentas = entrega.exists ? (entrega.data().cuentas || []) : [];
    const medio = orden.metodoPago === 'mercadopago' || orden.mpPaymentId ? 'mercadopago' : 'flow';
    const juegos = await juegosPorPublicacion(db, id, orden, cuentas);
    await guardarOrden({
      orderId: id,
      email: email || orden.email,
      uid: uid || null,
      total: orden.montos?.total || 0,
      metodo: medio,
      productos: productosDesdeOrden(orden, cuentas, juegos),
      createdAt: orden.createdAt || orden.creadoEn || null
    });
  }
}

export async function listarMisCompras({ uid, email } = {}) {
  const db = getDb();
  const correo = String(email || '').trim().toLowerCase();
  if (uid || correo) await copiarPagadas(db, { uid, email: correo });
  if (uid && correo) {
    const sueltas = await db.collection('orders').where('email', '==', correo).where('uid', '==', null).get();
    for (const doc of sueltas.docs) {
      const data = doc.data() || {};
      if (!puedeReclamar(data, { uid, email: correo })) continue;
      await doc.ref.update({ uid });
    }
  }
  if (!uid) return [];
  const snap = await db.collection('orders').where('uid', '==', uid).get();
  const lista = [];
  for (const doc of snap.docs) {
    const data = doc.data() || {};
    if (data.uid !== uid) continue;
    const itemsSnap = await doc.ref.collection('items').get();
    const items = itemsSnap.docs.map((item) => {
      const d = item.data() || {};
      return {
        nombre: d.nombre || 'Producto',
        tipo: tipoDeItem(d.tipo),
        precio: Number(d.precio) || 0,
        juego: d.juego || '',
        account_user: d.account_user || '',
        account_pass: d.account_pass || '',
        account_email: d.account_email || ''
      };
    });
    lista.push({
      id: doc.id,
      idCorto: idCorto(doc.id),
      total: Number(data.total) || 0,
      metodo: data.metodo === 'mercadopago' ? 'mercadopago' : 'flow',
      status: data.status || 'pagado',
      createdAt: millisDeFecha(data.createdAt),
      items
    });
  }
  lista.sort((a, b) => b.createdAt - a.createdAt);
  return lista;
}
