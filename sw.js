/* Hors connexion : la page et les photos sont gardées sur le téléphone.
   La page est servie depuis la copie locale, puis mise à jour en arrière-plan :
   une nouvelle version apparaît au lancement suivant. */
const CACHE = 'coach-v1';
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
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url), same = url.origin === self.location.origin;
  const font = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!same && !font) return;
  if ((same && url.pathname.indexOf('/img/') >= 0) || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => keep(req, res))));   // photos, polices : copie locale d'abord
    return;
  }
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(res => keep(req, res));
    return hit ? (net.catch(() => {}), hit) : net;                                                 // page : copie locale, mise à jour derrière
  }));
});
