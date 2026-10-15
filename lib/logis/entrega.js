import { FieldValue, getDb } from './db.js';

export function decodificarDato(valor) {
  if (!valor || typeof valor !== 'string') return '';
  try {
    return Buffer.from(valor, 'base64').toString('utf8');
  } catch {
    return valor;
  }
}

export function camposPerfilVip(tipoVip, expira) {
  return {
    esVendedorVip: true,
    tipoVip,
    vipExpira: expira,
    isVip: true,
    plan: 'vip'
  };
}

export async function activarPasesVip(orden, db = getDb()) {
  const pases = (orden.items || []).filter((item) => item.tipoItem === 'pase_vip');
  if (!pases.length || !orden.compradorUid) return null;

  let mejor = null;
  for (const pase of pases) {
    if (pase.tipoVipPase === 'pro') mejor = 'pro';
    else if (!mejor) mejor = 'basico';
  }
  if (!mejor) return null;

  const perfilRef = db.collection('perfiles').doc(orden.compradorUid);
  const perfilSnap = await perfilRef.get();
  const data = perfilSnap.exists ? perfilSnap.data() : {};
  let base = new Date();
  const expiraActual = data.vipExpira?.toDate?.() || (data.vipExpira?._seconds ? new Date(data.vipExpira._seconds * 1000) : null);
  if (expiraActual && expiraActual.getTime() > base.getTime()) base = expiraActual;
  const expira = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);

  await perfilRef.set(camposPerfilVip(mejor, expira), { merge: true });

  return { tipoVip: mejor, vipExpira: expira, isVip: true, plan: 'vip' };
}

export async function entregarCuentas(orden, db = getDb()) {
  const entregadas = [];
  for (const item of orden.items || []) {
    if (item.tipoItem === 'pase_vip' || !item.publicacionId) continue;
    const secretSnap = await db.collection('cuentas_secretas').doc(item.publicacionId).get();
    const secret = secretSnap.exists ? secretSnap.data() : {};
    const payload = {
      publicacionId: item.publicacionId,
      titulo: item.titulo || 'Cuenta',
      cantidad: item.cantidad || 1,
      vendedorUid: item.vendedorUid || secret.vendedorUid || '',
      emailCuenta: decodificarDato(secret.email_enc),
      passwordCuenta: decodificarDato(secret.pass_enc),
      telefono: decodificarDato(secret.tel_enc),
      recuperacion: decodificarDato(secret.recup_enc),
      entregaAutomatica: !!secret.autorizadoEntregaAuto || secretSnap.exists
    };
    entregadas.push(payload);
  }

  const entregaRef = db.collection('entregas').doc(orden.commerceOrder);
  await entregaRef.set({
    commerceOrder: orden.commerceOrder,
    compradorUid: orden.compradorUid,
    compradorEmail: orden.email,
    cuentas: entregadas,
    estado: 'entregada',
    fecha: FieldValue.serverTimestamp()
  }, { merge: true });

  return entregadas;
}

export async function registrarVenta(orden, { pago, entregas, stock }, db = getDb()) {
  const ventaRef = db.collection('ventas').doc(orden.commerceOrder);
  await ventaRef.set({
    commerceOrder: orden.commerceOrder,
    compradorUid: orden.compradorUid,
    compradorEmail: orden.email,
    items: orden.items,
    montos: orden.montos,
    flow: {
      token: pago?.token || orden.flowToken || '',
      flowOrder: pago?.flowOrder || '',
      status: pago?.status || 2
    },
    entregas,
    stock,
    estado: 'completada',
    fecha: FieldValue.serverTimestamp()
  }, { merge: true });
  return ventaRef.id;
}

export async function vaciarCarrito(uid, db = getDb()) {
  if (!uid) return;
  const items = await db.collection('carritos').doc(uid).collection('items').get();
  const batch = db.batch();
  items.docs.forEach((doc) => batch.delete(doc.ref));
  if (!items.empty) await batch.commit();
}

export async function quitarPasesDelCarrito(uid, db = getDb()) {
  if (!uid) return;
  const items = await db.collection('carritos').doc(uid).collection('items').get();
  const batch = db.batch();
  let n = 0;
  items.docs.forEach((doc) => {
    if (doc.data().tipoItem === 'pase_vip') {
      batch.delete(doc.ref);
      n += 1;
    }
  });
  if (n) await batch.commit();
}
