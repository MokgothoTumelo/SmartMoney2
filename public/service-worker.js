/* SmartMoney service worker — cache-first, versioned, offline after first load */
const CACHE_NAME = 'smartmoney-v9';
const ASSETS = [
  './',
  './index.html',
  './money.html',
  './budget.html',
  './goals.html',
  './safety.html',
  './settings.html',
  './auth.html',
  './css/styles.css',
  './js/store.js',
  './js/firebase.js',
  './js/sync.js',
  './js/ui.js',
  './js/page-welcome.js',
  './js/page-money.js',
  './js/page-budget.js',
  './js/page-goals.js',
  './js/page-safety.js',
  './js/page-settings.js',
  './js/page-auth.js',
  './js/chatbot.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (new URL(event.request.url).pathname.startsWith('/api/')) return; /* never cache API calls */
  /* firebase-config.js: network first so edits take effect (falls back to cache offline) */
  if (new URL(event.request.url).pathname.endsWith('/js/firebase-config.js')) {
    event.respondWith(
      fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type === 'opaque') return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
