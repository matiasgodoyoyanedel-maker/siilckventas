import crypto from 'crypto';

export default async function handler(req, res) {
  // CORS para que funcione desde tu web
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Usa POST' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { amount, email } = body;

    const apiKey = process.env.FLOW_API_KEY;
    const secretKey = process.env.FLOW_SECRET_KEY;

    if (!apiKey || !secretKey) {
      return res.status(500).json({ error: 'Faltan claves de Flow en Vercel' });
    }

    const commerceOrder = `SIIILCK-${Date.now()}`;
    
    // AJUSTA ESTAS 2 URLS A TU DOMINIO REAL
    const params = {
      apiKey: apiKey,
      commerceOrder: commerceOrder,
      subject: 'Compra en Siilckventas',
      currency: 'CLP',
      amount: parseInt(amount),
      email: email || 'cliente@siiilckventas.com',
      urlConfirmation: 'https://siiilckventas.com/api/confirm',
      urlReturn: 'https://siiilckventas.com/formulario.html?ok=1',
    };

    // Firma Flow
    const keys = Object.keys(params).sort();
    let toSign = '';
    for (let k of keys) toSign += k + params[k];
    
    const signature = crypto.createHmac('sha256', secretKey).update(toSign).digest('hex');

    const formData = new URLSearchParams({ ...params, s: signature }).toString();

    const flowRes = await fetch('https://www.flow.cl/api/payment/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData
    });

    const data = await flowRes.json();

    if (!data.url || !data.token) {
      return res.status(500).json({ error: 'Flow no respondió bien', detalle: data });
    }

    // Esta es la URL a la que tienes que mandar al cliente
    return res.status(200).json({ 
      flowUrl: `${data.url}?s=${data.token}` 
    });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
