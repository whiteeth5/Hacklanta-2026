/*
  Home Base: service worker
  -------------------------
  Saves a copy of the app on the phone so it opens and works with no internet.

  IMPORTANT: Every time you change any file and put the site online again,
  change the version number below (v1 -> v2 -> v3...). That tells phones
  to download the new files and shows people a "Refresh" button.
*/
const CACHE = "home-base-v1";

const FILES = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/storage.js",
  "./js/app.js",
  "./manifest.webmanifest",
  "./fonts/atkinson-hyperlegible-latin-400-normal.woff2",
  "./fonts/atkinson-hyperlegible-latin-700-normal.woff2",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/favicon-32.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
});

// Remove old versions once the new one takes over.
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// The app sends this when someone taps "Refresh" on the update message.
self.addEventListener("message", event => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;

  // Pages: try the internet first so people get updates, fall back to the saved copy offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Everything else (styles, scripts, fonts, icons): use the saved copy, fetch if missing.
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(cache => cache.put(req, copy));
      }
      return res;
    }))
  );
});
