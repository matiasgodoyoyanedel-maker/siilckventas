import { FieldValue, getDb } from './db.js';

export function anonimizarNombre(n, comuna) {
  const raw = String(n || 'Comprador').trim();
  const p = raw.split(/\s+/).filter(Boolean);
  const primero = (p[0] || 'Comprador').replace(/@.*/, '');
  const nombre = primero.charAt(0).toUpperCase() + primero.slice(1);
  return `${nombre} de ${comuna || 'Santiago'}`;
}

function nombreDesdeOrden(orden, perfil) {
  return perfil?.username
    || (orden?.email ? String(orden.email).split('@')[0] : '')
    || 'Comprador';
}

function productoDesdeOrden(orden) {
  const items = orden?.items || [];
  const cuenta = items.find((it) => it.tipoItem !== 'pase_vip');
  if (cuenta?.titulo) return cuenta.titulo;
  const pase = items.find((it) => it.tipoItem === 'pase_vip');
  if (pase) return pase.titulo || (pase.tipoVipPase === 'pro' ? 'Pase VIP Pro' : 'Pase VIP Básico');
  return 'un producto en SiilckVentas';
}

export async function registrarActividadCompra(orden, db = getDb()) {
  try {
    let perfil = {};
    if (orden?.compradorUid) {
      const snap = await db.collection('perfiles').doc(orden.compradorUid).get();
      perfil = snap.exists ? snap.data() : {};
    }
    const comuna = perfil.comuna || perfil.ciudad || orden.comuna || 'Santiago';
    const nombre = nombreDesdeOrden(orden, perfil);
    await db.collection('recentActivity').add({
      type: 'purchase',
      nombreAnonimizado: anonimizarNombre(nombre, comuna),
      producto: productoDesdeOrden(orden),
      comuna,
      commerceOrder: orden?.commerceOrder || '',
      createdAt: FieldValue.serverTimestamp()
    });
  } catch (e) {
    console.error('recentActivity compra:', e.message);
  }
}

export async function registrarActividadVendedor({ username, comuna } = {}, db = getDb()) {
  try {
    const lugar = comuna || 'Santiago';
    await db.collection('recentActivity').add({
      type: 'new_seller',
      nombreAnonimizado: anonimizarNombre(username || 'Vendedor', lugar),
      producto: '',
      comuna: lugar,
      createdAt: FieldValue.serverTimestamp()
    });
  } catch (e) {
    console.error('recentActivity vendedor:', e.message);
  }
}
