self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Keep network behavior unchanged while still providing a functional fetch handler for installability checks.
  event.respondWith(fetch(event.request));
});
