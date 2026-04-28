import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/** Dev-server middleware that proxies external media (mostly videos)
 *  back to the editor with CORS headers added. The export pipeline
 *  needs to read video pixels into a canvas via html-to-image; if the
 *  source host doesn't serve `Access-Control-Allow-Origin`, the canvas
 *  taints and `toDataURL()` refuses to read it. This proxy fetches the
 *  asset server-side (no CORS check on server-to-server fetches) and
 *  streams it back from the same origin as the editor, so the canvas
 *  paint is allowed.
 *
 *  Mirrors the production handler at `api/media-proxy.ts` (Vercel).
 *  Both endpoints accept `?url=<encoded video URL>` and apply the
 *  same hostname allow-list so the proxy can't be repurposed as an
 *  open relay.
 */
function mediaProxyPlugin(): Plugin {
  return {
    name: 'media-proxy',
    configureServer(server) {
      server.middlewares.use('/api/media-proxy', async (req, res) => {
        try {
          const reqUrl = new URL(req.url ?? '', 'http://x');
          const target = reqUrl.searchParams.get('url');
          if (!target) {
            res.statusCode = 400;
            res.end('missing url');
            return;
          }
          if (!isAllowedMediaHost(target)) {
            res.statusCode = 403;
            res.end('host not allowed');
            return;
          }
          const upstream = await fetch(target, { redirect: 'follow' });
          res.statusCode = upstream.status;
          res.setHeader('Access-Control-Allow-Origin', '*');
          const ct = upstream.headers.get('content-type');
          if (ct) res.setHeader('Content-Type', ct);
          const cl = upstream.headers.get('content-length');
          if (cl) res.setHeader('Content-Length', cl);
          const buf = Buffer.from(await upstream.arrayBuffer());
          res.end(buf);
        } catch (e) {
          res.statusCode = 502;
          res.end('proxy error: ' + String(e));
        }
      });
    },
  };
}

/** Allow-list of hostname patterns the proxy will fetch. Keep this
 *  conservative — the proxy runs on the same origin as the editor, so
 *  any host added here is effectively trusted with our bandwidth +
 *  cookie context. Add a host only when a marketer asks for it. */
function isAllowedMediaHost(url: string): boolean {
  let host = '';
  try { host = new URL(url).hostname.toLowerCase(); } catch { return false; }
  const allow = [
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
  return allow.some((re) => re.test(host));
}

export default defineConfig({
  plugins: [react(), mediaProxyPlugin()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    // @ffmpeg/ffmpeg spawns a web worker via `new URL('./worker.js', import.meta.url)`.
    // Vite's pre-bundler breaks that relative resolution silently, so exclude it.
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
});
