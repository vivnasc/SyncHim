/* SyncHim · service worker
 *
 * Estratégia:
 *   - Static assets (/_next/static/*, /icons/*, /marina/*, fontes):
 *     cache-first com revalidação em background.
 *   - HTML pages (navigation requests): network-first com fallback
 *     para a última versão em cache, e fallback final para uma
 *     página offline.
 *   - APIs (/api/*): sempre network. Nunca cacheadas.
 *
 * Versionamento: muda CACHE_VERSION para forçar invalidação total.
 */

const CACHE_VERSION = 'v1';
const STATIC_CACHE  = `synchim-static-${CACHE_VERSION}`;
const HTML_CACHE    = `synchim-html-${CACHE_VERSION}`;
const OFFLINE_URL   = '/offline';

const PRECACHE_URLS = [
  '/offline',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/icon.svg',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await Promise.allSettled(PRECACHE_URLS.map((u) => cache.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => k.startsWith('synchim-') && !k.endsWith(`-${CACHE_VERSION}`))
        .map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/marina/') ||
    /\.(?:woff2?|ttf|eot|svg|png|jpg|jpeg|webp|avif|ico|css|js)$/i.test(url.pathname)
  );
}

function isApi(url) {
  return url.pathname.startsWith('/api/');
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) {
    // revalidação em background
    fetch(request).then((res) => { if (res.ok) cache.put(request, res.clone()); }).catch(() => {});
    return hit;
  }
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(request);
    if (hit) return hit;
    if (request.mode === 'navigate') {
      const offline = await cache.match(OFFLINE_URL) || await caches.match(OFFLINE_URL);
      if (offline) return offline;
    }
    throw err;
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Só lidamos com same-origin para evitar cachear PayPal, Turnstile, Resend, etc.
  if (url.origin !== self.location.origin) return;

  if (isApi(url)) return;                                 // sempre rede
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }
  if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(req, HTML_CACHE));
    return;
  }
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
