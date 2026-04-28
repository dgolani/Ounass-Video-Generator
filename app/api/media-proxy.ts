// Vercel serverless function — proxies external media (videos, mostly)
// back to the editor with CORS headers added. Mirrors the dev-server
// middleware in `vite.config.ts` so the same `/api/media-proxy?url=...`
// path works locally and in production.
//
// Why this exists: the MP4 export pipeline reads video pixels into a
// canvas via html-to-image. If the source host doesn't serve
// `Access-Control-Allow-Origin`, the canvas taints and `toDataURL()`
// refuses to read it. Server-to-server fetches don't have CORS
// constraints — we re-emit the bytes from our own origin so the
// canvas paint is allowed.

export const config = {
  // Run on Vercel's edge runtime — fast cold start, streaming
  // response, generous body-size limits, and lower bandwidth cost
  // than the Node runtime for proxy workloads.
  runtime: 'edge',
};

const ALLOW_HOSTS: RegExp[] = [
  /(^|\.)pexels\.com$/,
  /(^|\.)pexelsusercontent\.com$/,
  /(^|\.)pixabay\.com$/,
  /(^|\.)coverr\.co$/,
  /(^|\.)cloudinary\.com$/,
  /(^|\.)mixkit\.co$/,
  /(^|\.)videvo\.net$/,
  /(^|\.)cdn\.cloudflare\.com$/,
  /(^|\.)googleapis\.com$/,
  /(^|\.)amazonaws\.com$/,
];

function isAllowedHost(target: string): boolean {
  try {
    const host = new URL(target).hostname.toLowerCase();
    return ALLOW_HOSTS.some((re) => re.test(host));
  } catch {
    return false;
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
    });
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return new Response('method not allowed', { status: 405 });
  }

  const url = new URL(req.url);
  const target = url.searchParams.get('url');
  if (!target) {
    return new Response('missing url', { status: 400 });
  }
  if (!isAllowedHost(target)) {
    return new Response('host not allowed', { status: 403 });
  }

  let upstream: Response;
  try {
    // Forward the verb. HEAD lets the editor's compatibility probe
    // ask "would this URL export OK?" without us pulling the whole
    // file — cheap, fast, no bandwidth wasted.
    //
    // Browser-like User-Agent + Accept so Cloudflare-fronted CDNs
    // (Pexels, etc.) don't 503 us with their bot-protection page.
    upstream = await fetch(target, {
      method: req.method === 'HEAD' ? 'HEAD' : 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        Accept: 'video/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
  } catch (e) {
    return new Response('proxy fetch error: ' + String(e), { status: 502 });
  }

  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', '*');
  const ct = upstream.headers.get('content-type');
  if (ct) headers.set('Content-Type', ct);
  const cl = upstream.headers.get('content-length');
  if (cl) headers.set('Content-Length', cl);
  // Cache moderately at the edge — the marketer rarely changes the
  // backdrop URL within a session, and proxied videos are public
  // assets so a shared cache is fine.
  headers.set('Cache-Control', 'public, max-age=300, s-maxage=3600');

  return new Response(req.method === 'HEAD' ? null : upstream.body, {
    status: upstream.status,
    headers,
  });
}
