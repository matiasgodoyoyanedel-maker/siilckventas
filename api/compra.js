import { getDb } from '../lib/logis/db.js';
import { verificarTokenSesion } from '../lib/logis/sesion.js';
import { estaPagada, puedeVerDatosCuenta } from '../lib/logis/entrega.js';
import { confirmarWebhook } from '../lib/logis/pagos.js';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function cuentasDesdeEntrega(entrega) {
  return (entrega?.cuentas || []).map((cuenta) => ({
    publicacionId: cuenta.publicacionId || '',
    titulo: cuenta.titulo || 'Cuenta',
    vendedorUid: cuenta.vendedorUid || '',
    email: cuenta.emailCuenta || '',
    clave: cuenta.passwordCuenta || '',
    telefono: cuenta.telefono || '',
    recuperacion: cuenta.recuperacion || ''
  }));
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Usa GET' });

  try {
    const header = req.headers?.authorization || '';
    const idToken = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!idToken) return res.status(401).json({ ok: false, error: 'Inicia sesión para ver tu compra.' });

    const sesion = await verificarTokenSesion(idToken);
    if (!sesion.ok) return res.status(401).json({ ok: false, error: sesion.error });
    const uid = sesion.uid;

    const orderId = String(req.query?.order_id || req.query?.id || '').trim();
    if (!orderId) return res.status(400).json({ ok: false, error: 'Falta el número de orden.' });

    const db = getDb();
    const ref = db.collection('ordenes').doc(orderId);
    let snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ ok: false, error: 'No encontramos esa compra.' });
    let orden = snap.data() || {};
    if (orden.compradorUid !== uid && orden.buyer_id !== uid) {
      return res.status(403).json({ ok: false, error: 'Esta compra no pertenece a tu cuenta.' });
    }

    if (!estaPagada(orden) && orden.flowToken) {
      try {
        await confirmarWebhook(orden.flowToken);
        snap = await ref.get();
        orden = snap.exists ? (snap.data() || {}) : orden;
      } catch (e) {
        console.error(JSON.stringify({ evento: 'compra_reconfirma_error', commerceOrder: orderId, error: e.message }));
      }
    }

    const paid = estaPagada(orden);
    const total = Number(orden.montos?.total || 0);
    const cuerpo = {
      ok: true,
      paid,
      total,
      commerceOrder: orderId,
      id: orden.id || orderId,
      transactionId: orden.transactionId || orderId,
      flowOrder: orden.flowOrder || '',
      flowTransactionId: orden.flowTransactionId || orden.flowOrder || orderId,
      estado: orden.estado || orden.status || '',
      tieneCuentas: false
    };

    const quiereDatos = req.query?.datos === '1';
    if (!quiereDatos) {
      const privada = await db.collection('compras_privadas').doc(orderId).get();
      const n = privada.exists ? (privada.data().datosCuenta || []).length : 0;
      cuerpo.tieneCuentas = n > 0 || (orden.items || []).some((item) => item.tipoItem !== 'pase_vip' && item.publicacionId);
      return res.status(200).json(cuerpo);
    }

    if (!puedeVerDatosCuenta({ paid, buyerId: orden.compradorUid || orden.buyer_id, userId: uid })) {
      return res.status(403).json({ ok: false, error: 'El pago todavía no está confirmado.' });
    }

    const privada = await db.collection('compras_privadas').doc(orderId).get();
    let cuentas = privada.exists ? (privada.data().datosCuenta || []) : [];
    if (!cuentas.length) {
      const entrega = await db.collection('entregas').doc(orderId).get();
      if (entrega.exists) cuentas = cuentasDesdeEntrega(entrega.data());
    }
    cuerpo.tieneCuentas = cuentas.length > 0;
    cuerpo.cuentas = cuentas;
    console.log(JSON.stringify({ evento: 'compra_datos_leidos', commerceOrder: orderId, cuentas: cuentas.length }));
    return res.status(200).json(cuerpo);
  } catch (e) {
    console.error(JSON.stringify({ evento: 'compra_error', error: e.message }));
    return res.status(500).json({ ok: false, error: 'No se pudo leer la compra.' });
  }
}
