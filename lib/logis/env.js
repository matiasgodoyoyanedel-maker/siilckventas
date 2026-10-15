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
    urlReturn: primero('FLOW_URL_RETURN') || `${siteUrl}/carrito.html?ok=1`
  };
}

export function hayClavesFlow() {
  const { apiKey, secretKey } = envFlow();
  return !!(apiKey && secretKey);
}
