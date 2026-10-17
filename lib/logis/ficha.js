import { getDb } from './db.js';
import { fichaPublica, perfilPublico, promedioEstrellas, recientesPublicas } from '../reputacion.js';

function uidDe(pub) {
  return String((pub && (pub.vendedorUid || pub.ownerId || pub.userId)) || '');
}

export async function leerFicha(id, db = getDb()) {
  const limpio = String(id || '').trim();
  if (!limpio || limpio.length > 200 || limpio.includes('/') || limpio.includes('..')) {
    return { ok: false, error: 'Falta el enlace de la cuenta.' };
  }
  const doc = await db.collection('publicaciones').doc(limpio).get();
  if (!doc.exists) return { ok: false, error: 'Esta cuenta ya no está publicada.' };
  const publicacion = fichaPublica(doc.id, doc.data() || {});
  const uid = uidDe(publicacion);
  let vendedor = perfilPublico({});
  if (uid) {
    const perfil = await db.collection('perfiles').doc(uid).get();
    if (perfil.exists) vendedor = perfilPublico(perfil.data() || {});
  }
  let reputacion = {
    promedio: Number(publicacion.resenasPromedio) || 0,
    totalResenas: Number(publicacion.resenasTotal) || 0,
    ventasCompletadas: 0,
    resenas: Array.isArray(publicacion.resenasRecientes) ? publicacion.resenasRecientes : []
  };
  if (uid) {
    const rep = await db.collection('reputacion').doc(uid).get();
    const resenas = await db.collection('resenas').where('vendedorUid', '==', uid).get();
    const lista = resenas.docs.map((item) => item.data() || {});
    const stats = promedioEstrellas(lista);
    const viva = rep.exists ? (rep.data() || {}) : {};
    reputacion = {
      promedio: stats.total ? stats.promedio : (Number(viva.promedio) || reputacion.promedio),
      totalResenas: stats.total || Number(viva.totalResenas) || reputacion.totalResenas,
      ventasCompletadas: Number(viva.ventasCompletadas) || 0,
      resenas: recientesPublicas(lista.length ? lista : reputacion.resenas)
    };
  }
  return { ok: true, publicacion, vendedor, reputacion };
}

export async function leerMapaReputacion(db = getDb()) {
  const [reps, resenas] = await Promise.all([
    db.collection('reputacion').get(),
    db.collection('resenas').get()
  ]);
  const porUid = {};
  resenas.forEach((doc) => {
    const r = doc.data() || {};
    const uid = String(r.vendedorUid || '');
    if (!uid) return;
    if (!porUid[uid]) porUid[uid] = [];
    porUid[uid].push(r);
  });
  const vendedores = {};
  reps.forEach((doc) => {
    const d = doc.data() || {};
    vendedores[doc.id] = {
      promedio: Number(d.promedio) || 0,
      totalResenas: Number(d.totalResenas) || 0,
      ventasCompletadas: Number(d.ventasCompletadas) || 0,
      resenas: []
    };
  });
  Object.keys(porUid).forEach((uid) => {
    const stats = promedioEstrellas(porUid[uid]);
    const prev = vendedores[uid] || {};
    vendedores[uid] = {
      promedio: stats.total ? stats.promedio : (Number(prev.promedio) || 0),
      totalResenas: stats.total || Number(prev.totalResenas) || 0,
      ventasCompletadas: Number(prev.ventasCompletadas) || 0,
      resenas: recientesPublicas(porUid[uid])
    };
  });
  return { ok: true, vendedores };
}

async function aplicarEnPublicaciones(db, cambios) {
  if (!cambios.length) return;
  if (typeof db.batch === 'function') {
    let batch = db.batch();
    let n = 0;
    const commits = [];
    cambios.forEach((cambio) => {
      batch.set(cambio.ref, cambio.payload, { merge: true });
      n += 1;
      if (n === 400) {
        commits.push(batch.commit());
        batch = db.batch();
        n = 0;
      }
    });
    if (n) commits.push(batch.commit());
    await Promise.all(commits);
    return;
  }
  await Promise.all(cambios.map((cambio) => cambio.ref.set(cambio.payload, { merge: true })));
}

export async function copiarResenasEnPublicaciones(db, uid, stats, resenas) {
  const vendedorUid = String(uid || '');
  if (!vendedorUid) return { resenasPromedio: 0, resenasTotal: 0, resenasRecientes: [] };
  const payload = {
    resenasPromedio: Number(stats && stats.promedio) || 0,
    resenasTotal: Number(stats && stats.total) || 0,
    resenasRecientes: recientesPublicas(resenas)
  };
  const pubs = await db.collection('publicaciones').where('vendedorUid', '==', vendedorUid).get();
  const cambios = [];
  pubs.forEach((doc) => cambios.push({ ref: doc.ref, payload }));
  await aplicarEnPublicaciones(db, cambios);
  return payload;
}

export async function copiarMapaEnPublicaciones(db, vendedores) {
  const mapa = vendedores || {};
  const pubs = await db.collection('publicaciones').get();
  const cambios = [];
  pubs.forEach((doc) => {
    const p = doc.data() || {};
    const uid = uidDe(p);
    const info = mapa[uid];
    if (!info || !(Number(info.totalResenas) > 0)) return;
    const recientes = Array.isArray(info.resenas) ? info.resenas : [];
    const mismo = Number(p.resenasTotal) === Number(info.totalResenas)
      && Number(p.resenasPromedio) === Number(info.promedio)
      && Array.isArray(p.resenasRecientes)
      && p.resenasRecientes.length === recientes.length;
    if (mismo) return;
    cambios.push({
      ref: doc.ref,
      payload: {
        resenasPromedio: Number(info.promedio) || 0,
        resenasTotal: Number(info.totalResenas) || 0,
        resenasRecientes: recientes
      }
    });
  });
  await aplicarEnPublicaciones(db, cambios);
  return cambios.length;
}
