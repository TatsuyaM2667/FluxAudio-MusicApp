/// <reference lib="webworker" />

const CACHE_NAME = 'fluxaudio-v1';

// App shell files to cache for offline
const APP_SHELL_FILES = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
    '/apple-touch-icon.png',
    '/favicon-16.png',
    '/favicon-32.png',
    '/splash.png',
    '/splash_bg.jpg',
];

// External resources to cache
const EXTERNAL_CACHE = [
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
    'https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap',
    'https://cdn.jsdelivr.net/npm/jsmediatags@3.9.7/dist/jsmediatags.min.js',
];

const sw = self;

sw.addEventListener('install', (event) => {
    console.log('[ServiceWorker] Install');
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            // Cache app shell
            await cache.addAll(APP_SHELL_FILES);
            // Cache external resources (fail silently)
            for (const url of EXTERNAL_CACHE) {
                try {
                    await cache.add(url);
                } catch (e) {
                    console.warn(`[ServiceWorker] Failed to cache: ${url}`, e);
                }
            }
            console.log('[ServiceWorker] App shell cached');
        })
    );
    sw.skipWaiting();
});

sw.addEventListener('activate', (event) => {
    console.log('[ServiceWorker] Activate');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    sw.clients.claim();
});

sw.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip Chrome extension requests
    if (url.protocol === 'chrome-extension:') return;

    // Intercept offline audio and video requests
    if (url.pathname.startsWith('/__offline_audio__/') || url.pathname.startsWith('/__offline_video__/')) {
        event.respondWith((async () => {
            try {
                const isVideo = url.pathname.startsWith('/__offline_video__/');
                const prefix = isVideo ? '/__offline_video__/' : '/__offline_audio__/';
                const encodedPath = url.pathname.replace(prefix, '');
                const path = decodeURIComponent(encodedPath);

                const getOfflineAudioFromDB = (imgPath) => {
                    return new Promise((resolve) => {
                        const DB_NAME = 'fluxaudio-downloads';
                        const DB_VERSION = 1;
                        const AUDIO_STORE = 'audio_files';
                        const request = indexedDB.open(DB_NAME, DB_VERSION);
                        request.onerror = () => resolve(null);
                        request.onsuccess = (e) => {
                            const db = e.target.result;
                            if (!db.objectStoreNames.contains(AUDIO_STORE)) {
                                resolve(null);
                                return;
                            }
                            const tx = db.transaction(AUDIO_STORE, 'readonly');
                            const store = tx.objectStore(AUDIO_STORE);
                            const getReq = store.get(imgPath);
                            getReq.onsuccess = () => resolve(getReq.result);
                            getReq.onerror = () => resolve(null);
                        };
                    });
                };

                let blob = null;

                // 1. Try Cache Storage first (New faster method)
                const MEDIA_CACHE = 'fluxaudio-media-v1';
                const cache = await caches.open(MEDIA_CACHE);
                const cachedRes = await cache.match(event.request);
                
                if (cachedRes) {
                    blob = await cachedRes.blob();
                } else if (!isVideo) {
                    // 2. Fallback to IndexedDB (Backward compatibility)
                    blob = await getOfflineAudioFromDB(path);
                }

                if (!blob) {
                    return new Response('Not found in offline storage', { status: 404 });
                }

                const mimeType = blob.type || (isVideo ? 'video/mp4' : 'audio/mpeg');

                // Handle HTTP range requests (critical for media seeking and iOS Safari)
                const rangeHeader = event.request.headers.get('Range');
                if (rangeHeader) {
                    const parts = rangeHeader.replace(/bytes=/, '').split('-');
                    const start = parseInt(parts[0], 10);
                    const end = parts[1] ? parseInt(parts[1], 10) : blob.size - 1;
                    const chunk = blob.slice(start, end + 1);
                    return new Response(chunk, {
                        status: 206,
                        statusText: 'Partial Content',
                        headers: {
                            'Content-Type': mimeType,
                            'Content-Range': `bytes ${start}-${end}/${blob.size}`,
                            'Content-Length': chunk.size.toString(),
                            'Accept-Ranges': 'bytes'
                        }
                    });
                } else {
                    return new Response(blob, {
                        status: 200,
                        headers: {
                            'Content-Type': mimeType,
                            'Content-Length': blob.size.toString(),
                            'Accept-Ranges': 'bytes'
                        }
                    });
                }
            } catch (err) {
                console.error('[SW] Error serving offline media:', err);
                return new Response('Error serving offline media', { status: 500 });
            }
        })());
        return;
    }

    // For navigation requests (HTML pages), use network-first strategy
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Clone and cache the response
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    return caches.match(event.request).then((cached) => {
                        return cached || caches.match('/index.html');
                    });
                })
        );
        return;
    }

    // For JS/CSS assets, use cache-first strategy
    if (url.pathname.match(/\.(js|css|woff2?|ttf|eot)$/) || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com' || url.hostname === 'cdn.jsdelivr.net') {
        event.respondWith(
            caches.match(event.request).then((cached) => {
                if (cached) return cached;
                return fetch(event.request).then((response) => {
                    if (response.ok) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return response;
                });
            })
        );
        return;
    }

    // For images, use cache-first
    if (url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|avif|ico)$/)) {
        event.respondWith(
            caches.match(event.request).then((cached) => {
                if (cached) return cached;
                return fetch(event.request).then((response) => {
                    if (response.ok) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return response;
                }).catch(() => {
                    // Return a fallback for failed image requests
                    return new Response('', { status: 404 });
                });
            })
        );
        return;
    }

    // For API requests (music data), use network-first
    // Audio files are NOT cached by service worker - they're stored in IndexedDB by PwaDownloadService
});
