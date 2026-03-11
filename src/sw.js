const CACHE_NAME = 'pedido-spar-v3-0-0';
const urlsToCache = [
  './compra_spar.html',
  './manifest.json',
  // La CDN de Tailwind se almacenará a medida que se intercepten las llamadas
];

// Instalar el Service Worker y almacenar recursos iniciales
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cache abierta. Guardando Shell.');
        return cache.addAll(urlsToCache);
      })
  );
  // Fuerza al SW que espera a convertirse en el SW activo.
  self.skipWaiting();
});

// Activar y limpiar cachés antiguas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName !== CACHE_NAME;
        }).map(cacheName => {
          console.log('[SW] Borrando caché antigua:', cacheName);
          return caches.delete(cacheName);
        })
      );
    })
  );
  self.clients.claim();
});

// Interceptar peticiones de red
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Devuelve la respuesta cacheadita, si existe.
        if (response) {
          return response;
        }

        // Importante: clona la solicitud original, es solo un "uso"
        let fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          function(response) {
            // Comprueba si la respuesta es válida
            if(!response || response.status !== 200 || response.type !== 'basic') {
                // Guarda las de otras webs (CDNs Tailwind external) de todas formas (CORS opaco o basic)
                if(response && response.type === 'opaque' && event.request.url.includes('cdn.tailwindcss')) {
                  // Opcional, guardar si es la CDN pura
                  let responseToCache = response.clone();
                  caches.open(CACHE_NAME).then(function(cache) {
                    cache.put(event.request, responseToCache);
                  }).catch(e => console.log('No se pudo cachear cdn',e));
                }
              return response;
            }

            // Clona la respuesta y guárdala también en caché (estrategia Network First para nuevas cositas)
            let responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        ).catch(error => {
          // Si estamos Offline y la llamada a fetch falla.
          console.log('[SW] Fetch falló (OFFLINE) para url: ', event.request.url);
          // Opcionalmente devolver 'compra_spar.html' como fallback para peticiones de navegación genéricas
        });
      })
    );
});
