const CACHE = 'gymdolph-v094';
const URLS = [
  './', './index.html', './style.css', './app.js', './data.js',
  './manifest.json', './sw.js',
  './logo-main.png', './logo-secondary.png', './logo-splash.png',
  './icon-192.png', './icon-512.png',
  './splash-anim.json',
  'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js',
  './Rajdhani-Regular.ttf', './Rajdhani-SemiBold.ttf', './Rajdhani-Bold.ttf',
  './Exo2-Light.ttf', './Exo2-Regular.ttf', './Exo2-Italic.ttf',
  './Exo2-SemiBold.ttf', './Exo2-ExtraBold.ttf',
];
self.addEventListener('install', e => e.waitUntil(
  caches.open(CACHE).then(c => c.addAll(URLS.map(u => new Request(u, {cache:'reload'}))))
    .catch(err => console.warn('SW cache partial failure:', err))
));
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
));
self.addEventListener('fetch', e => e.respondWith(
  caches.match(e.request).then(r => r || fetch(e.request))
));
