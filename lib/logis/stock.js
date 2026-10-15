import { getDb } from './db.js';

export function hayStock(publicacion, cantidad = 1) {
  const stock = Number(publicacion?.stock ?? 1);
  const qty = Math.max(1, parseInt(cantidad, 10) || 1);
  return stock >= qty;
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
      t.update(ref, { stock: nuevo, agotado: nuevo <= 0 });
      return { publicacionId: item.publicacionId, stockAnterior: actual, stockNuevo: nuevo };
    });
    resultados.push(actualizado);
  }
  return resultados;
}
