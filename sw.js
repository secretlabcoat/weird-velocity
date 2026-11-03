// Network-first for the game's own files so a reload sees a new Pages build.
// Nested module imports are ordinary same-origin fetches, so they are covered too.

const CACHE = "weird-velocity-v1";
const FRESH = /\.(js|css|html|json)(\?|$)/i;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!FRESH.test(url.pathname)) return;
  event.respondWith(networkFirst(request));
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const fresh = await fetch(request, { cache: "no-cache" });
    if (fresh && fresh.ok) await cache.put(request, fresh.clone());
    if (fresh && fresh.status === 304) {
      const cached = await cache.match(request);
      if (cached) return cached;
    }
    return fresh;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}
