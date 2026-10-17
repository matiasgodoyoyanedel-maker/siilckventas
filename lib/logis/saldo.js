import { FieldValue, getDb } from './db.js';
import { debeLiberar, diasRetencion, montoVendedor, puedeRetirar, DIA_MS } from '../reputacion.js';

function idMovimiento(orden, item, index) {
  const ordenId = String(orden.commerceOrder || orden.id || 'orden');
  const pub = String(item.publicacionId || index);
  return `${ordenId}_${pub}`.replace(/[^\w-]/g, '').slice(0, 180);
}

export async function acreditarVenta(orden, db = getDb(), ahora = Date.now()) {
  const items = orden?.items || [];
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const monto = montoVendedor(item);
    const vendedorUid = String(item?.vendedorUid || '');
    if (!vendedorUid || monto < 1) continue;
    const ref = db.collection('movimientos_saldo').doc(idMovimiento(orden, item, i));
    const ya = await ref.get();
    if (ya.exists) continue;
    const dias = diasRetencion(item.garantia);
    await ref.set({
      vendedorUid,
      ordenId: String(orden.commerceOrder || ''),
      publicacionId: String(item.publicacionId || ''),
      titulo: String(item.titulo || 'Cuenta'),
      monto,
      garantia: Math.round(Number(item.garantia) || 0),
      diasRetencion: dias,
      estado: 'retenido',
      liberaEn: ahora + dias * DIA_MS,
      creadoEn: ahora
    });
    const patch = {
      retenido: FieldValue.increment(monto),
      totalVendido: FieldValue.increment(monto),
      ventasCompletadas: FieldValue.increment(1)
    };
    await db.collection('saldos').doc(vendedorUid).set(patch, { merge: true });
    await db.collection('reputacion').doc(vendedorUid).set({
      vendedorUid,
      ventasCompletadas: FieldValue.increment(1)
    }, { merge: true });
    await db.collection('perfiles').doc(vendedorUid).set({ salesCount: FieldValue.increment(1) }, { merge: true });
    await db.collection('users').doc(vendedorUid).set({ salesCount: FieldValue.increment(1) }, { merge: true });
  }
  return { ok: true };
}

export async function liberarRetenciones(uid, db = getDb(), ahora = Date.now()) {
  if (!uid) return { ok: true, liberados: 0 };
  const snap = await db.collection('movimientos_saldo').where('vendedorUid', '==', uid).get();
  let liberados = 0;
  for (const doc of snap.docs) {
    const hecho = await db.runTransaction(async (t) => {
      const fresh = await t.get(doc.ref);
      if (!fresh.exists || !debeLiberar(fresh.data(), ahora)) return false;
      const monto = Math.round(Number(fresh.data().monto) || 0);
      if (monto < 1) return false;
      t.update(doc.ref, { estado: 'disponible', liberadoEn: ahora });
      t.set(db.collection('saldos').doc(uid), {
        retenido: FieldValue.increment(-monto),
        disponible: FieldValue.increment(monto)
      }, { merge: true });
      return true;
    });
    if (hecho) liberados += 1;
  }
  return { ok: true, liberados };
}

export async function solicitarRetiro({ uid, monto, destino } = {}, db = getDb()) {
  const banco = String(destino || '').trim().slice(0, 300);
  if (banco.length < 6) return { ok: false, error: 'Indica tus datos bancarios para el retiro.' };
  if (!uid) return { ok: false, error: 'Inicia sesión.' };
  await liberarRetenciones(uid, db);
  const saldoRef = db.collection('saldos').doc(uid);
  return db.runTransaction(async (t) => {
    const snap = await t.get(saldoRef);
    const data = snap.exists ? snap.data() : {};
    const check = puedeRetirar(data, monto);
    if (!check.ok) return check;
    const retiroRef = db.collection('retiros').doc();
    t.set(saldoRef, { disponible: FieldValue.increment(-check.monto) }, { merge: true });
    t.set(retiroRef, {
      vendedorUid: uid,
      monto: check.monto,
      destino: banco,
      estado: 'pendiente',
      creadoEn: Date.now()
    });
    return { ok: true, id: retiroRef.id, monto: check.monto };
  });
}

function numero(valor) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

export async function leerSaldo(uid, db = getDb()) {
  await liberarRetenciones(uid, db);
  const saldoSnap = await db.collection('saldos').doc(uid).get();
  const saldoData = saldoSnap.exists ? saldoSnap.data() : {};
  const movimientosSnap = await db.collection('movimientos_saldo').where('vendedorUid', '==', uid).get();
  const retirosSnap = await db.collection('retiros').where('vendedorUid', '==', uid).get();
  const movimientos = movimientosSnap.docs.map((doc) => {
    const d = doc.data() || {};
    return {
      id: doc.id,
      titulo: d.titulo || 'Venta',
      monto: numero(d.monto),
      estado: d.estado || 'retenido',
      liberaEn: numero(d.liberaEn),
      creadoEn: numero(d.creadoEn),
      diasRetencion: numero(d.diasRetencion)
    };
  }).sort((a, b) => b.creadoEn - a.creadoEn);
  const retiros = retirosSnap.docs.map((doc) => {
    const d = doc.data() || {};
    return {
      id: doc.id,
      monto: numero(d.monto),
      destino: d.destino || '',
      estado: d.estado || 'pendiente',
      creadoEn: numero(d.creadoEn)
    };
  }).sort((a, b) => b.creadoEn - a.creadoEn);
  return {
    ok: true,
    saldo: {
      disponible: numero(saldoData.disponible),
      retenido: numero(saldoData.retenido),
      totalVendido: numero(saldoData.totalVendido),
      ventasCompletadas: numero(saldoData.ventasCompletadas)
    },
    movimientos,
    retiros
  };
}
