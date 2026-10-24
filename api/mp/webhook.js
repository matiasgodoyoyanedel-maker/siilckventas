import { getDb } from '../../lib/logis/db.js';
import { envMercadoPago, secretoWebhookMercadoPago } from '../../lib/logis/env.js';
import {
  avisoMercadoPagoValido,
  confirmarOrdenComercioMercadoPago,
  confirmarPagoMercadoPago,
  esAvisoOrdenMercadoPago,
  extraerAvisoMercadoPago
} from '../../lib/logis/mercadopago.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ error: 'Usa POST' });

  try {
    const aviso = extraerAvisoMercadoPago(req);
    let db = null;
    try { db = getDb(); } catch { db = null; }
    const secret = await secretoWebhookMercadoPago(db);
    const firma = req.headers?.['x-signature'] || '';
    const requestId = req.headers?.['x-request-id'] || '';
    if (secret && !avisoMercadoPagoValido({ firmaHeader: firma, requestId, id: aviso.id, secret })) {
      return res.status(401).json({ ok: false, error: 'Firma inválida' });
    }
    console.log(JSON.stringify({ evento: 'mp_webhook', topic: aviso.topic, id: aviso.id }));
    if (!aviso.id) return res.status(200).json({ ok: true });
    const resultado = esAvisoOrdenMercadoPago(aviso.topic)
      ? await confirmarOrdenComercioMercadoPago(aviso.id)
      : await confirmarPagoMercadoPago({ paymentId: aviso.id });
    console.log(JSON.stringify({
      evento: 'mp_webhook_resultado',
      ok: !!resultado?.ok,
      commerceOrder: resultado?.commerceOrder || '',
      status: resultado?.status || '',
      pendiente: !!resultado?.pendiente
    }));
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(JSON.stringify({ evento: 'mp_webhook_error', error: e.message }));
    return res.status(500).json({ ok: false, error: 'Reintentar' });
  }
}
