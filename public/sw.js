/**
 * Service worker "kill-switch" (auto-destructivo).
 *
 * La app actual NO usa service workers. Este fichero existe para NEUTRALIZAR
 * cualquier service worker antiguo que quedara registrado en esta ruta por una
 * versión anterior y que esté sirviendo contenido cacheado (haciendo que los
 * usuarios vean versiones viejas de la app, sobre todo en PWAs instaladas).
 *
 * Cuando el navegador comprueba la actualización del service worker registrado,
 * encuentra este script, lo instala, y al activarse: borra todas las cachés, se
 * desregistra y recarga las ventanas abiertas. A partir de ahí ya no hay service
 * worker y todo se sirve fresco desde la red.
 */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      } catch {
        // Si falla el borrado de cachés, seguimos: lo importante es desregistrar.
      }
      try {
        await self.registration.unregister();
      } catch {
        // Ignorar: puede que ya no esté registrado.
      }
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => client.navigate(client.url));
    })()
  );
});
