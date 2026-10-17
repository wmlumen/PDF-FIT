// Conductor Service Worker - Push + Offline support
const CACHE_NAME = 'conductor-v1';
const ASSETS_TO_CACHE = [
  '/conductor.html',
  '/auth.js',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-solid-900.woff2'
];

// Install: cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: network first, fallback to cache
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({
          success: false,
          error: 'Sin conexión a internet',
          offline: true
        }), {
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            'x-offline': 'true'
          }
        });
      })
    );
    return;
  }
  
  // For static assets: network first, cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone);
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Listen for messages from clients (e.g., trigger sync)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SYNC_OUTBOX') {
    // Notificar a los clientes que sincronicen
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({ type: 'SYNC_OUTBOX' });
      });
    });
  }
});

self.addEventListener('push', (event) => {
  let data = { title: 'Nuevo viaje', body: 'Tenés un nuevo viaje asignado' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {}
  
  const options = {
    body: data.body || 'Tenés un nuevo viaje asignado',
    icon: 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 100 100%27%3E%3Crect width=%27100%27 height=%27100%27 rx=%2720%27 fill=%27%231e293b%27/%3E%3Ctext x=%2750%27 y=%2768%27 text-anchor=%27middle%27 font-size=%2750%27 fill=%27white%27%3E🚗%3C/text%3E%3C/svg%3E',
    badge: 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 100 100%27%3E%3Crect width=%27100%27 height=%27100%27 rx=%2720%27 fill=%27%231e293b%27/%3E%3Ctext x=%2750%27 y=%2768%27 text-anchor=%27middle%27 font-size=%2750%27 fill=%27white%27%3E🚗%3C/text%3E%3C/svg%3E',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/conductor.html' }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click: open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/conductor.html';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/conductor') && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(urlToOpen);
    })
  );
});
