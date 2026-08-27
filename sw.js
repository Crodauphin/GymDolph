// Cache key is derived automatically per-app from the repo path, so this file is
// IDENTICAL in both Gym Dolph and Girly Gym Dolph — copy it as-is, no editing.
// Bump VERSION when engine files change, to force returning installs to update.
const VERSION = 'v0919';
const APP = (self.location.pathname.split('/').filter(Boolean)[0] || 'app').toLowerCase();
const CACHE = 'gymdolph-' + VERSION + '-' + APP;   // e.g. gymdolph-v097b-gymdolph / -girlygymdolph
const URLS = [
  './', './index.html', './style.css', './app.js',
  './Gym_Program-GitHub.js', './Athlete_Profile-GitHub.js', './App_Config-GitHub.js',
  './manifest.json', './sw.js',
  './logo-main-dark.png', './logo-secondary-dark.png',
  './logo-main-bright.png', './logo-secondary-bright.png',
  './icon-192.png', './icon-512.png',
  './splash-anim-dark.json', './splash-anim-bright.json',
  './lottie.min.js',            // v0.9.18 (E14): was a cdnjs URL. addAll() is
                                // all-or-nothing, so a third-party outage at install
                                // time killed the whole precache and blocked updates.
  './SofiaSansCondensed-SemiBold.ttf', './SofiaSansCondensed-Bold.ttf',
  './Exo2-Regular.ttf', './Exo2-Italic.ttf', './Exo2-SemiBold.ttf',
];
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(URLS.map(u => new Request(u, {cache:'reload'}))))
      .catch(err => console.warn('SW cache partial failure:', err))
  );
});
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim())
));
self.addEventListener('fetch', e => e.respondWith(
  caches.match(e.request).then(r => r || fetch(e.request))
));
