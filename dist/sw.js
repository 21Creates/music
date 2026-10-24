const SHELL_CACHE = 'vinyl-shell-v8';
const RUNTIME_CACHE = 'vinyl-runtime-v8';
const IMAGE_CACHE = 'vinyl-images-v8';
const ICON_CACHE = 'vinyl-icons-v8';
const OFFLINE_AUDIO_CACHE = 'vinyl-offline-audio';

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/favicon.ico',
  '/favicon-32.png',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL_ASSETS).catch(() => {}))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![SHELL_CACHE, RUNTIME_CACHE, IMAGE_CACHE, ICON_CACHE, OFFLINE_AUDIO_CACHE].includes(k))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (e.data?.type === 'PRECACHE_ASSETS' && Array.isArray(e.data.urls)) {
    caches.open(SHELL_CACHE).then((cache) => {
      e.data.urls.forEach((url) => {
        fetch(url).then((res) => {
          if (res && res.status === 200) cache.put(url, res.clone());
        }).catch(() => {});
      });
    });
  }
  if (e.data?.type === 'RECONCILE_OFFLINE' && Array.isArray(e.data.urls)) {
    caches.open(OFFLINE_AUDIO_CACHE).then(async (cache) => {
      for (const url of e.data.urls) {
        const match = await cache.match(url);
        if (!match) {
          self.clients.matchAll().then((clients) => {
            clients.forEach((c) => c.postMessage({ type: 'OFFLINE_TRACK_MISSING', url }));
          });
        }
      }
    });
  }
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  const isAudioRequest =
    request.destination === 'audio' ||
    request.destination === 'media' ||
    /\.(?:mp3|wav|ogg|m4a|aac|flac|webm|opus|mp4|mov)$/i.test(url.pathname) ||
    url.pathname.includes('/vinyl-audio/');

  // Audio: normalize signed URLs to stable cache keys, check offline cache first
  if (isAudioRequest) {
    const cacheKey = url.pathname;
    const stableRequest = new Request(cacheKey);
    e.respondWith(
      caches.open(OFFLINE_AUDIO_CACHE).then((cache) =>
        cache.match(stableRequest).then((cached) => {
          if (cached) return cached;
          // Not saved offline -- fetch the original signed URL
          return fetch(request);
        }).catch(() => fetch(request))
      )
    );
    return;
  }

  // Navigation: network-first, fallback to shell, then offline page
  if (request.mode === 'navigate' || (url.pathname === '/' && !url.hash)) {
    e.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(request, clone));
          return res;
        })
        .catch(() =>
          caches.match(request).then((c) => c || caches.match('/index.html').then((ic) => ic || caches.match('/offline.html')))
        )
    );
    return;
  }

  // Icons: cache-first
  if (url.origin === location.origin && /\/(favicon|icon|apple-touch).*\.(png|ico|svg)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(ICON_CACHE).then((c) => c.put(request, clone));
        }
        return res;
      }))
    );
    return;
  }

  // Hashed assets: cache-first
  if (url.origin === location.origin && (url.pathname.startsWith('/assets/') || /\.(?:js|css|woff2?|ttf|eot)$/.test(url.pathname))) {
    e.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(request, clone));
        }
        return res;
      }))
    );
    return;
  }

  // Images: cache-first with eviction
  if (request.destination === 'image' || /\.(?:png|jpg|jpeg|gif|webp|svg|avif)$/i.test(url.pathname)) {
    e.respondWith(
      caches.open(IMAGE_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((res) => {
            if (res && res.status === 200) {
              const clone = res.clone();
              cache.put(request, clone);
              trimCache(IMAGE_CACHE, 200);
            }
            return res;
          });
        })
      )
    );
    return;
  }

  // Metadata/JSON: stale-while-revalidate
  if (request.destination === '' || url.pathname.includes('/rest/') || url.pathname.includes('/storage/')) {
    e.respondWith(
      caches.open(RUNTIME_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          const fetchPromise = fetch(request).then((res) => {
            if (res && (res.status === 200 || res.status === 206)) {
              const clone = res.clone();
              cache.put(request, clone);
              trimCache(RUNTIME_CACHE, 50);
            }
            return res;
          }).catch(() => cached);
          return cached || fetchPromise;
        })
      )
    );
    return;
  }
});

function trimCache(cacheName, maxEntries) {
  caches.open(cacheName).then((cache) => {
    cache.keys().then((keys) => {
      if (keys.length > maxEntries) {
        cache.delete(keys[0]);
      }
    });
  });
}
