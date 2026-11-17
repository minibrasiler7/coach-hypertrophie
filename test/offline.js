// Vérifie le fonctionnement hors connexion (version autonome). Usage : node offline.js <url>
const { chromium } = require('playwright');
const assert = require('assert');
const [url] = process.argv.slice(2);
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-CH' });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.goto(url); await page.waitForSelector('.title');
  await page.waitForFunction(() => localStorage.getItem('coach-photos') === '1', null, { timeout: 30000 });   // toutes les photos gardées
  const n = await page.evaluate(async () => (await (await caches.open('coach-v1')).keys()).filter(r => r.url.includes('/img/')).length);
  assert.strictEqual(n, 87, 'photos en cache : ' + n);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 10000 });
  await ctx.setOffline(true);
  await page.reload(); await page.waitForSelector('.title');                                                   // la page se recharge sans réseau
  assert.strictEqual(await page.textContent('.title'), 'Haut du corps A');
  await page.click('[data-act="start"]'); await page.waitForSelector('.exname');
  const ok = await page.evaluate(() => new Promise(res => { const im = new Image(); im.onload = () => res(im.naturalWidth); im.onerror = () => res(0); im.src = 'img/dc_halt.jpg'; }));
  assert.strictEqual(ok, 960, 'photo hors connexion');
  await page.fill('#in-r', '10'); await page.click('[data-act="logset"]'); await page.waitForSelector('.rest');
  assert((await page.textContent('#app')).includes('Sur l’écran d’accueil') === false);                         // (bloc visible dans Réglages seulement)
  await browser.close();
  if (errors.length) { console.log('ERREURS\n' + errors.join('\n')); process.exit(1); }
  console.log('hors connexion OK : page, 87 photos et séance sans réseau');
})().catch(e => { console.error('ÉCHEC', e); process.exit(1); });
