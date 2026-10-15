import crypto from 'crypto';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { amount, email } = req.body;
    const apiKey = process.env.FLOW_API_KEY;
    const secretKey = process.env.FLOW_SECRET_KEY;

    const params = {
      apiKey: apiKey,
      commerceOrder: `SIIILCK-${Date.now()}`,
      subject: 'Compra Siilckventas',
      currency: 'CLP',
      amount: parseInt(amount),
      email: email,
      urlConfirmation: 'https://siiilckventas.vercel.app/api/confirm',
      urlReturn: 'https://siiilckventas.vercel.app/carrito.html?ok=1',
    };

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
      return res.status(500).json({ error: 'Flow fallo', detalle: data });
    }

    return res.status(200).json({ flowUrl: `${data.url}?token=${data.token}` });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
