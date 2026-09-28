// VIVI 2.4: somente recursos visuais públicos entram no cache.
const CACHE = "vivi-visuais-v2-5-nome";
const PUBLICOS = ["/icons/icon-192.png", "/icons/icon-512.png", "/icons/maskable-512.png", "/banners/institucional.png", "/offline.html"];
self.addEventListener("install", (evento) => {
  evento.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PUBLICOS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (evento) => {
  evento.waitUntil(caches.keys().then((chaves) => Promise.all(chaves.filter((chave) => chave !== CACHE).map((chave) => caches.delete(chave)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (evento) => {
  const req = evento.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    evento.respondWith(fetch(req).catch(() => caches.match("/offline.html")));
    return;
  }
  const url = new URL(req.url);
  if (url.pathname.startsWith("/icons/") || url.pathname.startsWith("/banners/")) {
    evento.respondWith(caches.match(req).then((cached) => cached || fetch(req)));
  }
});
