// Chemins secondaires : fin de repos automatique, réglages, sauvegarde dans le compte (simulée), export, suppression.
const { chromium } = require('playwright');
const [url] = process.argv.slice(2);
const assert = require('assert');
const KEY = 'coach-hypertrophie-v1';
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-CH', timezoneId: 'Europe/Zurich' });
  // Faux « claude.use » : base de documents rangée dans localStorage, avec l'interface décrite par la plateforme
  await ctx.addInitScript(() => {
    const load = () => JSON.parse(localStorage.getItem('mockdb') || '{}'), store = d => localStorage.setItem('mockdb', JSON.stringify(d));
    const col = path => ({
      limit() { return this; },
      get: async () => { const d = load(); return { docs: Object.keys(d).filter(k => k.startsWith(path + '/')).map(k => ({ id: k.slice(path.length + 1), exists: true, data: () => Object.freeze(JSON.parse(JSON.stringify(d[k]))) })) }; },
      doc: id => ({
        set: async data => { if (!/^[A-Za-z0-9_\-.~:@+]+$/.test(id)) throw { code: 'invalid_argument' }; const d = load(); d[path + '/' + id] = data; store(d); window.__writes = (window.__writes || 0) + 1; },
        delete: async () => { const d = load(); delete d[path + '/' + id]; store(d); }
      })
    });
    window.claude = { use: async n => n === 'db' ? { collection: col } : n === 'user' ? { id: async () => 'u123' } : null };
    const spoken = []; window.__spoken = spoken;
    window.SpeechSynthesisUtterance = function (t) { this.text = t; };
    Object.defineProperty(window, 'speechSynthesis', { value: { speaking: false, pending: false, getVoices: () => [{ lang: 'fr-FR', name: 'Test' }], cancel() { }, speak(u) { spoken.push(u.text); }, addEventListener() { } }, configurable: true });
  });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const act = a => page.click('[data-act="' + a + '"]');
  const state = () => page.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  const db = () => page.evaluate(() => JSON.parse(localStorage.getItem('mockdb') || '{}'));

  await page.goto(url); await page.waitForSelector('.title');
  // Réglages : 3 séances par semaine, poids du corps
  await page.click('[data-act="tab"][data-v="settings"]');
  await page.click('[data-act="setdays"][data-v="3"]');
  await page.fill('#bw', '80'); await page.press('#bw', 'Tab');
  await page.click('[data-act="setrest"][data-k="restC"][data-d="-15"]');
  let st = await state(); assert.strictEqual(st.profile.days, 3); assert.strictEqual(st.profile.bw, 80); assert.strictEqual(st.settings.restC, 135);
  assert((await page.textContent('#app')).includes('dans ton compte Claude'), 'statut de sauvegarde');
  await page.click('[data-act="tab"][data-v="home"]');
  assert.strictEqual(await page.textContent('.title'), 'Corps entier A');

  // Séance : voix au démarrage, fin de repos automatique
  await act('start'); await page.waitForSelector('.exname');
  let spoken = await page.evaluate(() => window.__spoken.slice());
  assert(spoken[0].startsWith('Séance Corps entier A. Premier exercice : Presse à cuisses.'), spoken[0]);
  await page.fill('#in-w', '120'); await page.fill('#in-r', '10'); await act('logset');
  spoken = await page.evaluate(() => window.__spoken.slice());
  assert(spoken[spoken.length - 1].includes('Repos : 2 minutes 15'), spoken[spoken.length - 1]);
  for (let i = 0; i < 9; i++) await page.click('[data-act="restadj"][data-d="-15"]');   // repos ramené à zéro
  await page.waitForSelector('#in-w', { timeout: 4000 });                                  // la saisie revient toute seule
  spoken = await page.evaluate(() => window.__spoken.slice());
  assert(/C’est reparti\. Série 2\. 120 kilos\./.test(spoken[spoken.length - 1]), spoken[spoken.length - 1]);
  assert.strictEqual(await page.inputValue('#in-w'), '120');
  // Corriger une série, changer le pas de charge
  await page.click('.setchip'); await page.fill('#ed-r', '9'); await act('editsave');
  assert((await page.textContent('.setchip')).includes('× 9'));
  await act('stepsize'); await page.click('[data-act="stepset"][data-v="5"]');
  await page.click('[data-act="step"][data-k="w"][data-d="1"]'); assert.strictEqual(await page.inputValue('#in-w'), '125');
  // Pause puis reprise après rechargement de la page
  await act('quit'); await act('pause');
  await page.reload(); await page.waitForSelector('[data-act="resume"]');
  await act('resume'); await page.waitForSelector('.exname');
  assert((await page.textContent('.setchip')).includes('120 kg × 9'));
  // Terminer tôt
  await act('finish'); await act('finishnow'); await page.waitForSelector('.tiles');
  assert((await page.textContent('#app')).includes('Protéines : vise environ 128 g'));
  await page.waitForTimeout(1900);                                                          // écriture différée du profil
  let d = await db(); const keys = Object.keys(d).sort();
  assert(keys.includes('data/users/u123/meta') && keys.some(k => /\/s_\d+$/.test(k)), keys.join());
  assert.strictEqual(d['data/users/u123/meta'].sessions, undefined);

  // « Autre appareil » : stockage local vide, les séances reviennent du compte
  await page.evaluate(k => localStorage.removeItem(k), KEY);
  await page.reload(); await page.waitForSelector('.title'); await page.waitForTimeout(600);
  st = await state(); assert.strictEqual(st.sessions.length, 1); assert.strictEqual(st.profile.days, 3); assert.strictEqual(st.rot, 1);
  assert.strictEqual(await page.textContent('.title'), 'Corps entier B');

  // Export (copie refusée -> texte affiché), suppression de séance, effacement
  await page.click('[data-act="tab"][data-v="settings"]'); await act('export'); await page.waitForTimeout(300);
  const exported = (await page.$('#txt-out')) ? await page.inputValue('#txt-out') : JSON.stringify(await state());
  assert(JSON.parse(exported).sessions.length === 1);
  if (await page.$('#sheet.on')) await page.click('.box .btn[data-act="close"]');
  await page.click('[data-act="tab"][data-v="progress"]'); await page.click('.sess'); await act('delsession'); await act('confirmyes');
  await page.waitForTimeout(300); st = await state(); assert.strictEqual(st.sessions.length, 0);
  d = await db(); assert(!Object.keys(d).some(k => /\/s_\d+$/.test(k)), 'séance encore dans le compte');
  // Import
  await page.click('[data-act="tab"][data-v="settings"]'); await act('importopen'); await page.fill('#imp', exported); await act('importgo');
  st = await state(); assert.strictEqual(st.sessions.length, 1);
  await browser.close();
  if (errors.length) { console.log('ERREURS\n' + errors.join('\n')); process.exit(1); }
  console.log('chemins secondaires OK, aucune erreur de page');
})().catch(e => { console.error('ÉCHEC', e); process.exit(1); });
