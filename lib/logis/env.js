function primero(...nombres) {
  for (const nombre of nombres) {
    const valor = process.env[nombre];
    if (valor && String(valor).trim()) return String(valor).trim();
  }
  return '';
}

export function envFlow() {
  let siteUrl = primero('SITE_URL', 'VERCEL_PROJECT_PRODUCTION_URL', 'VERCEL_URL') || 'https://siilckventas.vercel.app';
  if (siteUrl && !/^https?:\/\//i.test(siteUrl)) siteUrl = `https://${siteUrl}`;
  siteUrl = siteUrl.replace(/\/$/, '');
  return {
    apiKey: primero('FLOW_API_KEY', 'FLOW_APIKEY', 'FLOW_KEY'),
    secretKey: primero('FLOW_SECRET_KEY', 'FLOW_SECRET', 'FLOW_API_SECRET'),
    sandbox: primero('FLOW_SANDBOX') === 'true',
    siteUrl,
    urlConfirmation: primero('FLOW_URL_CONFIRMATION') || `${siteUrl}/api/confirm`,
    urlReturn: primero('FLOW_URL_RETURN') || `${siteUrl}/api/retorno`
  };
}

export function urlSitioDesdeRequest(req, base) {
  const envBase = String(base || envFlow().siteUrl).replace(/\/$/, '');
  const hostRaw = req?.headers?.['x-forwarded-host'] || req?.headers?.host || '';
  const host = String(hostRaw).split(',')[0].trim();
  if (!host || /^(localhost|127\.|0\.0\.0\.0)/.test(host)) return envBase;
  const protoRaw = req?.headers?.['x-forwarded-proto'] || 'https';
  const proto = String(protoRaw).split(',')[0].trim() || 'https';
  return `${proto}://${host}`.replace(/\/$/, '');
}

export function urlsDePago(siteUrl) {
  const base = String(siteUrl || '').replace(/\/$/, '');
  return {
    urlConfirmation: `${base}/api/confirm`,
    urlReturn: `${base}/api/retorno`,
    exito: `${base}/pago/exito`,
    error: `${base}/pago/error`
  };
}

export function hayClavesFlow() {
  const { apiKey, secretKey } = envFlow();
  return !!(apiKey && secretKey);
}

export async function secretoWebhookMercadoPago(db) {
  const deEnv = envMercadoPago().webhookSecret;
  if (deEnv) return deEnv;
  if (!db || typeof db.collection !== 'function') return '';
  try {
    const snap = await db.collection('secretos').doc('mercadopago').get();
    const data = snap && snap.exists ? (snap.data() || {}) : {};
    return String(data.webhookSecret || data.secret || '').trim();
  } catch {
    return '';
  }
}

export function envMercadoPago() {
  const accessToken = primero(
    'MERCADOPAGO_ACCESS_TOKEN',
    'MP_ACCESS_TOKEN',
    'MERCADO_PAGO_ACCESS_TOKEN',
    'MERCADOPAGO_TOKEN'
  );
  const webhookSecret = primero('MERCADOPAGO_WEBHOOK_SECRET', 'MP_WEBHOOK_SECRET');
  const sandboxFlag = primero('MERCADOPAGO_SANDBOX', 'MP_SANDBOX') === 'true';
  return {
    accessToken,
    webhookSecret,
    sandbox: sandboxFlag || accessToken.startsWith('TEST-')
  };
}

export function urlsMercadoPago(siteUrl) {
  const base = String(siteUrl || '').replace(/\/$/, '');
  return {
    notificationUrl: `${base}/api/mp/webhook`,
    retorno: `${base}/api/mp/retorno`,
    exito: `${base}/pago/exito`,
    error: `${base}/pago/error`
  };
}
