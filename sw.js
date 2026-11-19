// ALAB Heat Index Checker service worker: offline app shell, fast start.
const CACHE = "alab-v11";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icons/mark-96.webp", "icons/logo-360.webp",
  "icons/icon-192.png", "icons/icon-512.png", "icons/favicon-32.png", "icons/favicon-48.png", "icons/apple-touch-icon.png", "lib/geotiff.min.js", "live.js"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;   // live weather/station data always from network
  if (url.pathname.includes("/icons/")) {                                       // icons: cache-first (never change within a version)
    e.respondWith(caches.match(e.request).then(m => m || fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; })));
    return;
  }
  // page: stale-while-revalidate → opens instantly, updates in the background
  e.respondWith(caches.match(e.request).then(cached => {
    const net = fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; }).catch(() => cached || caches.match("index.html"));
    return cached || net;
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type: "window"}).then(cs => cs.length ? cs[0].focus() : self.clients.openWindow("./")));
});
