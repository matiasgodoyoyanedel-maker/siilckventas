function primero(...nombres) {
  for (const nombre of nombres) {
    const valor = process.env[nombre];
    if (valor && String(valor).trim()) return String(valor).trim();
  }
  return '';
}

export function envFlow() {
  let siteUrl = primero('SITE_URL', 'NEXT_PUBLIC_BASE_URL', 'VERCEL_PROJECT_PRODUCTION_URL', 'VERCEL_URL') || 'https://www.siiilckventas.com';
  if (siteUrl && !/^https?:\/\//i.test(siteUrl)) siteUrl = `https://${siteUrl}`;
  siteUrl = siteUrl.replace(/\/$/, '');
  const sandbox = primero('FLOW_SANDBOX') === 'true';
  let flowBase = primero('FLOW_BASE_URL');
  if (flowBase) {
    flowBase = flowBase.replace(/\/$/, '');
    if (!/\/api$/i.test(flowBase)) flowBase += '/api';
  } else {
    flowBase = sandbox ? 'https://sandbox.flow.cl/api' : 'https://www.flow.cl/api';
  }
  return {
    apiKey: primero('FLOW_API_KEY', 'FLOW_APIKEY', 'FLOW_KEY'),
    secretKey: primero('FLOW_SECRET_KEY', 'FLOW_SECRET', 'FLOW_API_SECRET'),
    sandbox,
    flowBase,
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
