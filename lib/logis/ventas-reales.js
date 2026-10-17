import { getDb } from './db.js';
import { fichaPublica, perfilPublico, promedioEstrellas, recientesPublicas } from '../reputacion.js';

const COMPLETOS = new Set(['completado', 'completada', 'pagado', 'pagada', 'paid', 'entregado', 'entregada']);

export function estadoCompleto(doc) {
  if (!doc) return false;
  if (doc.paid === true || doc.pagado === true) return true;
  return [doc.status, doc.estado, doc.state].some((valor) => COMPLETOS.has(String(valor || '').toLowerCase()));
}

function tomarUid(set, valor) {
  const uid = String(valor || '').trim();
  if (uid) set.add(uid);
}

export function vendedoresDeOrden(doc, items) {
  const ids = new Set();
  const data = doc || {};
  tomarUid(ids, data.vendedorUid);
  tomarUid(ids, data.sellerUid);
  tomarUid(ids, data.sellerId);
  tomarUid(ids, data.seller_id);
  for (const item of items || data.items || []) {
    if (!item) continue;
    tomarUid(ids, item.vendedorUid);
    tomarUid(ids, item.sellerUid);
    tomarUid(ids, item.sellerId);
    tomarUid(ids, item.seller_id);
  }
  return [...ids];
}

export function esOrdenDeCuenta(data, items) {
  if (data && data.origen === 'pase_vip') return false;
  const lista = items || (data && data.items) || [];
  if (!lista.length) return true;
  return lista.some((item) => item && item.tipoItem !== 'pase_vip' && item.tipo !== 'servicio');
}

export function sumarVentas(registros) {
  const vistos = new Set();
  const totales = {};
  for (const registro of registros || []) {
    const data = (registro && registro.data) || {};
    const id = String((registro && registro.id) || '');
    if (!id || vistos.has(id) || !estadoCompleto(data) || !esOrdenDeCuenta(data, registro.items)) continue;
    vistos.add(id);
    for (const uid of vendedoresDeOrden(data, registro.items)) {
      totales[uid] = (totales[uid] || 0) + 1;
    }
  }
  return totales;
}

async function docsDe(db, nombre) {
  try {
    const snap = await db.collection(nombre).get();
    return snap.docs || [];
  } catch {
    return [];
  }
}

export async function mapaVentasReales(db = getDb()) {
  const [ordenes, orders, ventas, compras] = await Promise.all([
    docsDe(db, 'ordenes'),
    docsDe(db, 'orders'),
    docsDe(db, 'ventas'),
    docsDe(db, 'compras')
  ]);
  const registros = [];
  const agregar = (doc, items) => registros.push({ id: doc.id, data: doc.data() || {}, items: items || [] });
  for (const doc of [...ordenes, ...ventas, ...compras]) agregar(doc, (doc.data() || {}).items || []);
  for (const doc of orders) {
    let items = (doc.data() || {}).items || [];
    if (!items.length && doc.ref && typeof doc.ref.collection === 'function') {
      try {
        const sub = await doc.ref.collection('items').get();
        items = (sub.docs || []).map((item) => item.data() || {});
      } catch {
        items = [];
      }
    }
    agregar(doc, items);
  }
  return sumarVentas(registros);
}

function millis(valor) {
  if (!valor) return 0;
  if (typeof valor.toDate === 'function') return valor.toDate().getTime();
  if (typeof valor.seconds === 'number') return valor.seconds * 1000;
  if (typeof valor._seconds === 'number') return valor._seconds * 1000;
  if (typeof valor === 'number') return valor;
  const t = Date.parse(String(valor));
  return Number.isNaN(t) ? 0 : t;
}

export async function leerVendedor(uid, db = getDb()) {
  const id = String(uid || '').trim();
  if (!id || id.length > 200 || id.includes('/') || id.includes('..')) {
    return { ok: false, error: 'Falta el vendedor.' };
  }
  let data = {};
  const users = await db.collection('users').doc(id).get();
  if (users.exists) data = users.data() || {};
  const perfil = await db.collection('perfiles').doc(id).get();
  if (perfil.exists) data = { ...(perfil.data() || {}), ...data };
  if (!users.exists && !perfil.exists) return { ok: false, error: 'No encontramos a ese vendedor.' };
  const mapa = await mapaVentasReales(db);
  const resenasSnap = await db.collection('resenas').where('vendedorUid', '==', id).get();
  const lista = (resenasSnap.docs || []).map((doc) => doc.data() || {});
  const stats = promedioEstrellas(lista);
  const rep = await db.collection('reputacion').doc(id).get();
  const viva = rep.exists ? (rep.data() || {}) : {};
  const pubs = await db.collection('publicaciones').where('vendedorUid', '==', id).get();
  const publicaciones = [];
  pubs.forEach((doc) => {
    const p = doc.data() || {};
    const stock = p.stock == null || p.stock === '' ? 1 : Number(p.stock);
    if (p.vendida || stock <= 0) return;
    publicaciones.push(fichaPublica(doc.id, p));
  });
  const publico = perfilPublico(data);
  return {
    ok: true,
    vendedor: {
      uid: id,
      displayName: publico.displayName,
      username: publico.username,
      avatar: publico.avatar,
      tipoVip: data.tipoVip || publico.tipoVip || '',
      esVendedorVip: data.esVendedorVip === true || publico.esVendedorVip === true,
      esVip: data.esVip === true,
      miembroDesde: millis(data.creadoEn || data.createdAt || data.miembroDesde),
      salesCount: mapa[id] || 0,
      promedio: stats.total ? stats.promedio : (Number(viva.promedio) || 0),
      totalResenas: stats.total || Number(viva.totalResenas) || 0,
      resenas: recientesPublicas(lista)
    },
    publicaciones
  };
}

export async function backfillVentas(db = getDb()) {
  const mapa = await mapaVentasReales(db);
  const perfiles = await docsDe(db, 'perfiles');
  const users = await docsDe(db, 'users');
  const ids = new Set([
    ...perfiles.map((doc) => doc.id),
    ...users.map((doc) => doc.id),
    ...Object.keys(mapa)
  ]);
  for (const uid of ids) {
    const salesCount = mapa[uid] || 0;
    await db.collection('perfiles').doc(uid).set({ salesCount }, { merge: true });
    await db.collection('users').doc(uid).set({ salesCount }, { merge: true });
  }
  return { ok: true, actualizados: ids.size, ventas: mapa };
}
