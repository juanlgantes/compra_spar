const CACHE_NAME = 'compra-spar-v1';
// IMPORTANTE: En GitHub Pages, la raíz es el nombre del repositorio
const APP_PREFIX = '/compra_spar'; 

const urlsToCache = [
  `${APP_PREFIX}/`,
  `${APP_PREFIX}/index.html`,
  `${APP_PREFIX}/manifest.json`,
  // Añade aquí tus iconos si los tienes, ej: `${APP_PREFIX}/icon.png`
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Instalando y cacheando rutas críticas');
      return cache.addAll(urlsToCache);
    }).catch(err => console.error('[SW] Error en install:', err))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Borrando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Solo interceptar peticiones GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then(response => {
        // Si la respuesta no es válida, la devolvemos tal cual sin cachear
        if (!response || response.status !== 200) {
          return response;
        }

        // Cacheamos las respuestas exitosas (incluyendo CDNs como Tailwind)
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return response;
      }).catch(error => {
        console.error('[SW] Error en fetch:', error);
        // Aquí podrías devolver un fallback offline si lo tuvieras
      });
    })
  );
});
