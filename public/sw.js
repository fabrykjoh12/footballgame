/*
 * Self-destroying service worker.
 *
 * An earlier version of this site shipped a PWA service worker that aggressively
 * precached the whole app shell at /footballgame/sw.js. Returning visitors keep
 * being served that stale cached app even after the site is redeployed.
 *
 * This replacement (fetched by the browser's normal SW update check, since it
 * lives at the same URL) takes over, wipes every cache, unregisters itself, and
 * reloads open tabs so they load the current site fresh from the network.
 */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {
        /* ignore */
      }
      try {
        await self.registration.unregister();
      } catch {
        /* ignore */
      }
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) {
        try {
          client.navigate(client.url);
        } catch {
          /* ignore */
        }
      }
    })(),
  );
});
