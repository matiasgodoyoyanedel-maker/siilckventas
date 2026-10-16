export const config = {
  matcher: ['/google78561bbab4dd18b7.html', '/google78561bbab4dd18b7']
};

const LINEA = 'google-site-verification: google78561bbab4dd18b7.html\n';

export default function middleware() {
  return new Response(LINEA, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=300'
    }
  });
}
