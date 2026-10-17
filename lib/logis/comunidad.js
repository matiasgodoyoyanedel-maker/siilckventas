import { FieldValue, getDb } from './db.js';
import { copiarResenasEnPublicaciones } from './ficha.js';
import { normalizarReclamo, normalizarResena, promedioEstrellas, vendedorDesdeFuentes } from '../reputacion.js';

async function vendedorDeCompra(db, ordenId, preferido) {
  const order = await db.collection('orders').doc(ordenId).get();
  if (!order.exists) return { ok: false, error: 'No encontramos esa compra.' };
  const data = order.data() || {};
  if (!data.uid) return { ok: false, error: 'Esa compra todavía no está asociada a tu cuenta.' };
  const itemsSnap = await order.ref.collection('items').get();
  const items = itemsSnap.docs.map((doc) => doc.data() || {});
  let legacy = [];
  const orden = await db.collection('ordenes').doc(ordenId).get();
  if (orden.exists) legacy = (orden.data() || {}).items || [];
  const vendedor = vendedorDesdeFuentes(items, legacy);
  const pedido = String(preferido || '');
  const fuentes = [...items, ...legacy].map((i) => String(i && i.vendedorUid || '')).filter(Boolean);
  const uid = pedido && fuentes.includes(pedido) ? pedido : vendedor.vendedorUid;
  if (!uid) return { ok: false, error: 'Esta compra no tiene un vendedor para asociar.' };
  return { ok: true, uidComprador: data.uid, vendedorUid: uid, publicacionId: vendedor.publicacionId || '' };
}

export async function crearResena({ compradorUid, ordenId, estrellas, comentario, vendedorUid } = {}, db = getDb()) {
  const limpia = normalizarResena({ estrellas, comentario });
  if (!limpia.ok) return limpia;
  const id = String(ordenId || '').trim();
  if (!id) return { ok: false, error: 'Falta la compra.' };
  const compra = await vendedorDeCompra(db, id, vendedorUid);
  if (!compra.ok) return compra;
  if (compra.uidComprador !== compradorUid) return { ok: false, error: 'Solo puedes reseñar tus propias compras.' };
  const ref = db.collection('resenas').doc(id);
  const ya = await ref.get();
  if (ya.exists) return { ok: false, error: 'Ya dejaste una reseña en esta compra.' };
  await ref.set({
    ordenId: id,
    compradorUid,
    vendedorUid: compra.vendedorUid,
    publicacionId: compra.publicacionId,
    estrellas: limpia.estrellas,
    comentario: limpia.comentario,
    creadoEn: Date.now()
  });
  const todas = await db.collection('resenas').where('vendedorUid', '==', compra.vendedorUid).get();
  const stats = promedioEstrellas(todas.docs.map((doc) => doc.data() || {}));
  await db.collection('reputacion').doc(compra.vendedorUid).set({
    vendedorUid: compra.vendedorUid,
    promedio: stats.promedio,
    totalResenas: stats.total
  }, { merge: true });
  try {
    await copiarResenasEnPublicaciones(db, compra.vendedorUid, stats, todas.docs.map((doc) => doc.data() || {}));
  } catch (e) {
    console.error(JSON.stringify({ evento: 'resena_copia_publicacion', error: e.message }));
  }
  return { ok: true, estrellas: limpia.estrellas };
}

export async function crearReclamo({ compradorUid, ordenId, motivo, detalle } = {}, db = getDb()) {
  const limpio = normalizarReclamo({ motivo, detalle });
  if (!limpio.ok) return limpio;
  const id = String(ordenId || '').trim();
  if (!id) return { ok: false, error: 'Falta la compra.' };
  const compra = await vendedorDeCompra(db, id, '');
  if (!compra.ok) return compra;
  if (compra.uidComprador !== compradorUid) return { ok: false, error: 'Solo puedes reclamar tus propias compras.' };
  const ref = db.collection('reclamos').doc(id);
  const ya = await ref.get();
  if (ya.exists) return { ok: false, error: 'Ya hay un reclamo abierto para esta compra.' };
  await ref.set({
    ordenId: id,
    compradorUid,
    vendedorUid: compra.vendedorUid,
    motivo: limpio.motivo,
    detalle: limpio.detalle,
    estado: 'abierto',
    creadoEn: Date.now()
  });
  await db.collection('tickets').add({
    uid: compradorUid,
    motivo: `Reclamo de compra: ${limpio.motivo}`,
    descripcion: `${limpio.detalle}\nOrden: ${id}`,
    estado: 'Pendiente',
    ordenId: id,
    fecha: FieldValue.serverTimestamp()
  });
  return { ok: true };
}
