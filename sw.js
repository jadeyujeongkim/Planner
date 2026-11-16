/* Sage Planner service worker: the app opens offline after its first online visit. */
const VERSION = 'sage-planner-pwa-v1';
const LOCAL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
const REMOTE = [
  "https://cdn.jsdelivr.net/npm/htm@3.1.1/dist/htm.umd.js",
  "https://cdn.tailwindcss.com/3.4.17",
  "https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js",
  "https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=Noto+Sans+KR:wght@400;500;700&display=swap"
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) {
    return Promise.all([
      c.addAll(LOCAL),
      Promise.allSettled(REMOTE.map(function (u) {
        return fetch(u, { mode: 'no-cors' }).then(function (r) { return c.put(u, r); });
      }))
    ]);
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;
  const same = new URL(req.url).origin === self.location.origin;
  if (same) {
    /* own files: try the network so updates arrive, fall back to the cache offline */
    e.respondWith(fetch(req).then(function (res) {
      const copy = res.clone();
      caches.open(VERSION).then(function (c) { c.put(req, copy); });
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (m) { return m || caches.match('index.html'); });
    }));
  } else {
    /* libraries and fonts: cache first, fill the cache the first time they load */
    e.respondWith(caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        const copy = res.clone();
        caches.open(VERSION).then(function (c) { c.put(req, copy); });
        return res;
      });
    }));
  }
});
