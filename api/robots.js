import { urlSitioDesdeRequest } from '../lib/logis/env.js';

export default function handler(req, res) {
  const siteUrl = urlSitioDesdeRequest(req).replace(/\/$/, '');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const body = `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`;
  res.status(200).send(body);
}
