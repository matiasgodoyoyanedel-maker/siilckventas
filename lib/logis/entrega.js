import { FieldValue, getDb } from './db.js';

const CLAVES_SECRETAS = ['email', 'clave', 'password', 'email_enc', 'pass_enc', 'tel_enc', 'recup_enc', 'user_enc', 'inst_enc', 'usuario', 'instrucciones', 'datos_entrega', 'usuario_entrega', 'clave_entrega', 'correo_asociado', 'datosCuenta', 'datos_cuenta', 'passwordCuenta', 'emailCuenta', 'telefono', 'recuperacion'];

export function decodificarDato(valor) {
  if (!valor || typeof valor !== 'string') return '';
  try {
    return Buffer.from(valor, 'base64').toString('utf8');
  } catch {
    return valor;
  }
}

export function quitarSecretos(item) {
  const limpio = { ...(item || {}) };
  CLAVES_SECRETAS.forEach((clave) => { delete limpio[clave]; });
  return limpio;
}

export function puedeVerDatosCuenta({ paid, buyerId, userId }) {
  return paid === true && !!userId && !!buyerId && String(userId) === String(buyerId);
}

export function estaPagada(orden) {
  if (!orden) return false;
  if (orden.paid === true || orden.pagado === true) return true;
  const status = String(orden.status || orden.estado || '').toLowerCase();
  return status === 'paid' || status === 'pagado' || status === 'entregado' || status === 'completada';
}

export function datosCuentaDesdeSecreto(secret, item, publicacion) {
  const s = secret || {};
  const p = publicacion || {};
  return {
    publicacionId: item?.publicacionId || '',
    titulo: p.titulo || item?.titulo || 'Cuenta',
    juego: p.juego || item?.juego || '',
    nivel: p.nivel || '',
    region: p.region || '',
    vendedorUid: item?.vendedorUid || s.vendedorUid || p.vendedorUid || '',
    usuario: decodificarDato(s.user_enc),
    email: decodificarDato(s.email_enc),
    clave: decodificarDato(s.pass_enc),
    telefono: decodificarDato(s.tel_enc),
    recuperacion: decodificarDato(s.recup_enc),
    instrucciones: decodificarDato(s.inst_enc)
  };
}

export async function leerDatosCuenta(items, db = getDb()) {
  const datos = [];
  for (const item of items || []) {
    if (!item || item.tipoItem === 'pase_vip' || !item.publicacionId) continue;
    const pubSnap = await db.collection('publicaciones').doc(item.publicacionId).get();
    const secretSnap = await db.collection('cuentas_secretas').doc(item.publicacionId).get();
    datos.push(datosCuentaDesdeSecreto(
      secretSnap.exists ? secretSnap.data() : {},
      item,
      pubSnap.exists ? pubSnap.data() : {}
    ));
  }
  return datos;
}

export async function refrescarDatosCuenta(orden, db = getDb()) {
  const datosCuenta = await leerDatosCuenta(orden?.items || [], db);
  if (!orden?.commerceOrder) return datosCuenta;
  await db.collection('compras_privadas').doc(orden.commerceOrder).set({
    commerceOrder: orden.commerceOrder,
    compradorUid: orden.compradorUid || orden.buyer_id || '',
    datosCuenta
  }, { merge: true });
  return datosCuenta;
}

export async function guardarCompraPrivada(commerceOrder, { compradorUid, datosCuenta }, db = getDb()) {
  await db.collection('compras_privadas').doc(commerceOrder).set({
    commerceOrder,
    compradorUid: compradorUid || '',
    pagado: false,
    datosCuenta: datosCuenta || [],
    creadoEn: FieldValue.serverTimestamp()
  }, { merge: true });
}

export async function marcarCompraPagada(commerceOrder, db = getDb()) {
  await db.collection('compras_privadas').doc(commerceOrder).set({
    pagado: true,
    pagadoEn: FieldValue.serverTimestamp()
  }, { merge: true });
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

export async function quitarItemsDeOrden(uid, items = [], db = getDb()) {
  if (!uid) return;
  const ids = new Set(items.map((item) => item.carritoItemId).filter(Boolean));
  const pubs = new Set(items.map((item) => item.publicacionId).filter(Boolean));
  const snap = await db.collection('carritos').doc(uid).collection('items').get();
  const batch = db.batch();
  let n = 0;
  snap.docs.forEach((doc) => {
    const data = doc.data() || {};
    if (ids.has(doc.id) || (data.publicacionId && pubs.has(data.publicacionId))) {
      batch.delete(doc.ref);
      n += 1;
    }
  });
  if (n) await batch.commit();
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
