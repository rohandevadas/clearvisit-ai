// ClearVisit AI Service Worker
const CACHE_NAME = 'clearvisit-v1';
const urlsToCache = [
  '/',
  '/login.html',
  '/register.html', 
  '/dashboard.html',
  '/profile.html',
  '/visit.html',
  '/manifest.json',
  '/heart-icon.png',
];

// Install Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.log('Cache failed:', error);
      })
  );
});

// Fetch events - serve from cache when offline
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    console.log('API request detected, bypassing cache:', event.request.url);
    return; // Let the request go through normally
  }

  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          console.log('Serving from cache:', event.request.url);
          return response;
        }
        
        console.log('Fetching from network:', event.request.url);
        return fetch(event.request)
          .then((response) => {
            // Only cache successful responses for static assets
            if (response.status === 200 && 
                (event.request.url.includes('.html') || 
                 event.request.url.includes('.css') || 
                 event.request.url.includes('.js') || 
                 event.request.url.includes('.png') || 
                 event.request.url.includes('.jpg') || 
                 event.request.url.includes('.ico'))) {
              
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
            }
            return response;
          })
          .catch((error) => {
            console.log('Network fetch failed:', error);
            // Return a fallback page if available
            if (event.request.destination === 'document') {
              return caches.match('/login.html');
            }
          });
      })
  );
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Handle background sync (optional - for future features)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered');
  }
});

// Handle push notifications (optional - for future features)
self.addEventListener('push', (event) => {
  if (event.data) {
    const options = {
      body: event.data.text(),
      icon: '/heart-icon.png',
      badge: '/heart-icon.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      }
    };
        
    event.waitUntil(
      self.registration.showNotification('ClearVisit AI', options)
    );
  }
});