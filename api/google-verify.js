const LINEA = 'google-site-verification: google78561bbab4dd18b7.html\n';

export default function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  res.status(200).send(LINEA);
}
