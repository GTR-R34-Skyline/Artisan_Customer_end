const CACHE_NAME = 'artisan-shell-v2';
const OFFLINE_URL = '/offline.html';
const PRECACHE = [
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

const isSameOrigin = (url) => url.origin === self.location.origin;

const isDynamicData = (url) =>
  url.hostname.includes('supabase.co')
  || url.pathname.startsWith('/rest/')
  || url.pathname.startsWith('/auth/')
  || url.pathname.startsWith('/storage/')
  || url.pathname.includes('/functions/');

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (!isSameOrigin(url) || isDynamicData(url)) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        const copy = fresh.clone();
        const cache = await caches.open(CACHE_NAME);
        await cache.put('/', copy);
        return fresh;
      } catch {
        return (await caches.match('/')) || (await caches.match(OFFLINE_URL));
      }
    })());
    return;
  }

  const cacheableAsset = url.pathname.startsWith('/assets/')
    || url.pathname.startsWith('/icons/')
    || url.pathname === '/manifest.webmanifest'
    || url.pathname === OFFLINE_URL;

  if (!cacheableAsset) return;

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const fresh = await fetch(request);
      if (fresh.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, fresh.clone());
      }
      return fresh;
    } catch {
      return cached || (await caches.match(OFFLINE_URL));
    }
  })());
});
