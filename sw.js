/*
 * Kurzgefasst – Service Worker
 * - Fängt geteilte Seiten (POST an ./share-target) direkt auf dem Gerät ab.
 *   Die geteilte URL wird nie an GitHub Pages gesendet, sondern nur im
 *   URL-Fragment (#…) an die App übergeben – Fragmente verlassen das Gerät nicht.
 * - Hält die App-Dateien im Cache, damit sie sofort startet.
 */
const CACHE = 'kurzgefasst-v1';
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './style.css',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1) Geteilte Seite aus dem Android-Teilen-Menü
  if (req.method === 'POST' && url.origin === self.location.origin && url.pathname.endsWith('/share-target')) {
    event.respondWith(handleShare(req));
    return;
  }

  // 2) Alles Fremde (z. B. Backend-Aufrufe) unangetastet durchlassen
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // 3) App-Dateien: sofort aus dem Cache, im Hintergrund aktualisieren
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: true });
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

async function handleShare(req) {
  let shared = {};
  try {
    const form = await req.formData();
    shared = {
      title: String(form.get('title') || ''),
      text: String(form.get('text') || ''),
      url: String(form.get('url') || '')
    };
  } catch (e) {
    /* leere Freigabe – App zeigt dann das Eingabefeld */
  }
  const target = new URL('./', self.registration.scope);
  target.hash = 'share=' + encodeURIComponent(JSON.stringify(shared));
  return Response.redirect(target.href, 303);
}
