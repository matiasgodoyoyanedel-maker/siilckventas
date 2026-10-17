import { FieldValue, getDb } from './db.js';

export const MS_ANTES_DE_BORRAR_VENDIDA = 24 * 60 * 60 * 1000;

export function fechaVendida(data) {
  const v = data?.vendidaEn;
  if (!v) return null;
  if (typeof v.toDate === 'function') return v.toDate();
  if (v._seconds) return new Date(v._seconds * 1000);
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function debeEliminarPublicacion(data, ahora = new Date()) {
  if (!data || data.vendida !== true) return false;
  const fecha = fechaVendida(data);
  if (!fecha) return false;
  return ahora.getTime() - fecha.getTime() >= MS_ANTES_DE_BORRAR_VENDIDA;
}

export function cuentaEstaDisponible(publicacion) {
  if (!publicacion || publicacion.vendida === true) return false;
  const stock = publicacion.stock;
  if (stock == null || stock === '') return true;
  return Number(stock) > 0;
}

export function hayStock(publicacion, cantidad = 1) {
  const stock = Number(publicacion?.stock ?? 1);
  const qty = Math.max(1, parseInt(cantidad, 10) || 1);
  return stock >= qty;
}

export function cantidadSuperaStock(items) {
  const totales = new Map();
  for (const item of items || []) {
    if (!item || item.tipoItem === 'pase_vip' || !item.publicacionId) continue;
    const id = String(item.publicacionId);
    const qty = Math.max(1, parseInt(item.cantidad || item.cantidadSeleccionada || 1, 10) || 1);
    const stock = Number(item.stock ?? 1);
    const prev = totales.get(id) || { cantidad: 0, stock, titulo: item.titulo || 'Cuenta' };
    prev.cantidad += qty;
    if (Number.isFinite(stock)) prev.stock = stock;
    totales.set(id, prev);
  }
  for (const info of totales.values()) {
    if (info.cantidad > info.stock) {
      return { ok: false, error: `"${info.titulo}" tiene stock ${info.stock}. No se puede comprar ${info.cantidad}.` };
    }
  }
  return { ok: true };
}

export async function descontarStock(items, db = getDb()) {
  const resultados = [];
  for (const item of items) {
    if (item.tipoItem === 'pase_vip' || !item.publicacionId) continue;
    const ref = db.collection('publicaciones').doc(item.publicacionId);
    const qty = Math.max(1, parseInt(item.cantidad || 1, 10));
    const actualizado = await db.runTransaction(async (t) => {
      const snap = await t.get(ref);
      if (!snap.exists) throw new Error(`No se encontró la publicación ${item.publicacionId}`);
      const data = snap.data();
      const actual = Number(data.stock ?? 1);
      if (actual < qty) throw new Error(`Sin stock para "${data.titulo || item.titulo}"`);
      const nuevo = actual - qty;
      const patch = { stock: nuevo, agotado: nuevo <= 0 };
      if (nuevo <= 0) {
        patch.vendida = true;
        patch.vendidaEn = FieldValue.serverTimestamp();
      }
      t.update(ref, patch);
      return { publicacionId: item.publicacionId, stockAnterior: actual, stockNuevo: nuevo, vendida: nuevo <= 0 };
    });
    resultados.push(actualizado);
  }
  return resultados;
}

export async function eliminarPublicacionesVendidas(db = getDb(), ahora = new Date()) {
  const snap = await db.collection('publicaciones').where('vendida', '==', true).get();
  const borradas = [];
  for (const doc of snap.docs) {
    if (!debeEliminarPublicacion(doc.data(), ahora)) continue;
    await doc.ref.delete();
    borradas.push(doc.id);
  }
  if (borradas.length) {
    console.log(JSON.stringify({ evento: 'publicaciones_vendidas_eliminadas', cantidad: borradas.length }));
  }
  return borradas;
}
