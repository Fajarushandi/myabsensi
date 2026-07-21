// Ganti versi ini setiap kali ada update file
const CACHE_NAME = "absensi-v4";
const ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js"
];

// Install: cache semua asset versi baru
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  // Langsung aktif tanpa tunggu tab lama ditutup
  self.skipWaiting();
});

// Activate: hapus semua cache lama, langsung ambil alih semua client
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: Network first untuk HTML, cache first untuk asset statis
self.addEventListener("fetch", event => {
  const { request } = event;
  const url = new URL(request.url);

  // HTML -> selalu ambil dari network agar selalu fresh, fallback ke cache
  if (request.mode === "navigate" || (request.headers.get("accept") || "").includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Simpan versi terbaru ke cache
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match("/index.html")))
    );
    return;
  }

  // Asset statis (JS CDN, gambar, manifest) -> cache first
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response && response.status === 200 && request.method === "GET") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() => {
        if (request.mode === "navigate") return caches.match("/index.html");
      });
    })
  );
});

// Terima pesan SKIP_WAITING dari client (opsional, untuk update manual)
self.addEventListener("message", event => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
