const CACHE_NAME = 'business-manager-gh-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Only handle requests belonging to this app.
  if (url.origin !== self.location.origin) return;

  // Do not cache API responses or authenticated business data.
  if (url.pathname.startsWith('/api/')) return;

  // Network-only: avoid serving stale pages or private information.
});
