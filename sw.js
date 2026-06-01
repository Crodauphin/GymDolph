const CACHE = 'gymdolph-v08';
const ASSETS = ['./', './index.html', './style.css', './data.js', './app.js',
  './logo-main.png', './logo-secondary.png', './logo-splash.png',
  './icon-192.png', './icon-512.png'];
self.addEventListener('install',  e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(keys =>
  Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))));
self.addEventListener('fetch', e => e.respondWith(
  caches.match(e.request).then(r => r || fetch(e.request))));
