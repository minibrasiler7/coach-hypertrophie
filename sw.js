/* Hors connexion : la page, les photos et la voix du coach sont gardées sur le téléphone.
   La page vient du réseau quand il répond vite, sinon de la copie locale.
   Photos et sons viennent d'abord de la copie locale. */
const CACHE = 'coach-v2';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
function keep(req, res) {
  if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
  return res;
}
function timeout(ms) { return new Promise((_, rej) => setTimeout(() => rej(new Error('lent')), ms)); }
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url), same = url.origin === self.location.origin;
  const font = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!same && !font) return;
  if ((same && /\/(img|snd)\//.test(url.pathname)) || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => keep(req, res))));   // photos, sons, polices : copie locale d'abord
    return;
  }
  if (req.mode === 'navigate' || /\/(index\.html)?$/.test(url.pathname)) {
    const net = fetch(req).then(res => keep(req, res));                                            // page : réseau d'abord, 3 secondes au plus
    e.respondWith(Promise.race([net, timeout(3000)]).catch(() => caches.match(req).then(hit => hit || caches.match('index.html')).then(hit => hit || net)));
    return;
  }
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(res => keep(req, res));
    return hit ? (net.catch(() => {}), hit) : net;
  }));
});
