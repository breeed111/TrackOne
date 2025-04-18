const CACHE_NAME = 'fitness-tracker-v1';
const urlsToCache = [
'/',
'/index.html',
'/app.js',
'/manifest.json',
'/icon-192x192.png'
];

self.addEventListener('install', (event) => {
event.waitUntil(
caches.open(CACHE_NAME)
.then((cache) => cache.addAll(urlsToCache))
);
});

self.addEventListener('fetch', (event) => {
event.respondWith(
caches.match(event.request)
.then((response) => response || fetch(event.request))
);
});

self.addEventListener('activate', (event) => {
event.waitUntil(
caches.keys().then((cacheNames) => {
return Promise.all(
cacheNames.map((cache) => {
if (cache !== CACHE_NAME) {
return caches.delete(cache);
}
})
);
})
);
});