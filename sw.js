const CACHE_NAME = 'maa-cache-v1.8.13';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './manifest.json',
  './media/rigel circle logo.png',
  './media/Rigel Logo.png',
  './data/content_en.json',
  './data/content_as.json',
  './data/content_bn.json',
  './data/content_brx.json',
  './data/content_doi.json',
  './data/content_gom.json',
  './data/content_gu.json',
  './data/content_hi.json',
  './data/content_kn.json',
  './data/content_ks.json',
  './data/content_mai.json',
  './data/content_ml.json',
  './data/content_mni.json',
  './data/content_mr.json',
  './data/content_ne.json',
  './data/content_or.json',
  './data/content_pa.json',
  './data/content_sa.json',
  './data/content_sat.json',
  './data/content_sd.json',
  './data/content_ta.json',
  './data/content_te.json',
  './data/content_ur.json',
  './data/conditions.json',
  './data/qna.json',
  './data/govt_resources.json',
  './data/blog.json',
  './data/languages.json'
];

// Install Event - Caching all core assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching all static resources');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Stale-While-Revalidate Strategy
self.addEventListener('fetch', (e) => {
  // Only handle GET requests
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch new version in the background to update cache
        fetch(e.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, networkResponse);
            });
          }
        }).catch(() => { /* offline or failed network fetch, do nothing */ });

        return cachedResponse;
      }

      // If not in cache, fallback to network
      return fetch(e.request);
    })
  );
});

// Listen for message events (e.g. to skipWaiting)
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
