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

  // Séance : ce que dit le coach, fin de repos automatique
  const log = () => page.evaluate(() => Snd.log.slice());
  await act('start'); await page.waitForSelector('.exname');
  assert.strictEqual((await log())[0], 'coach:start0 presse:n presse:t1');
  await page.fill('#in-w', '120'); await page.fill('#in-r', '10'); await act('logset');
  assert(/^coach:ok\d$/.test((await log()).pop()), 'félicitation attendue : ' + (await log()).pop());   // haut de fourchette atteint
  for (let i = 0; i < 9; i++) await page.click('[data-act="restadj"][data-d="-15"]');   // repos ramené à zéro
  await page.waitForSelector('#in-w', { timeout: 4000 });                                  // la saisie revient toute seule
  assert(/^coach:go\d$/.test((await log()).pop()), 'signal de reprise attendu');
  assert.strictEqual(await page.inputValue('#in-w'), '120');
  await page.waitForTimeout(4600);                                                          // conseil de la deuxième série, quelques secondes après la reprise
  assert.strictEqual((await log()).pop(), 'presse:t2');
  await page.evaluate(() => { S.cur.encAt = Date.now(); }); await page.waitForTimeout(900); // encouragement pendant l'effort
  assert(/^coach:enc\d+$/.test((await log()).pop()), 'encouragement attendu');
  const said = (await log()).join(' ');
  assert(!/\d+ kilos|Repos :/.test(said));                                                 // plus aucun chiffre lu
  // Mode « Peu » : pas de félicitation ni de nom d'exercice, encouragement gardé pour la dernière série
  await page.evaluate(() => { S.settings.talk = 'peu'; });
  await page.fill('#in-r', '9'); const n0 = (await log()).length; await act('logset');
  assert.strictEqual((await log()).length, n0, 'le coach devrait se taire');
  await act('restskip'); assert.strictEqual(await page.evaluate(() => !!S.cur.encAt), true);                 // 3e et dernière série
  await page.evaluate(() => { S.settings.talk = 'normal'; S.cur.encAt = null; S.cur.tipAt = null; });
  await page.click('.setchip:last-child'); await act('editdel');                                              // on retire cette 2e série pour la suite du test
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
  // Changer de timbre : la voix masculine se charge et se décode
  await page.click('[data-act="tab"][data-v="settings"]');
  await page.click('[data-act="setvox"][data-v="m"]'); await page.waitForTimeout(1200);
  const vm = await page.evaluate(() => [S.settings.vox, Snd.log[Snd.log.length - 1], Object.keys(Snd.bufs).filter(k => k.startsWith('snd/m/')).length]);
  assert.deepStrictEqual(vm, ['m', 'coach:test0', 1]);
  await browser.close();
  if (errors.length) { console.log('ERREURS\n' + errors.join('\n')); process.exit(1); }
  console.log('chemins secondaires OK, aucune erreur de page');
})().catch(e => { console.error('ÉCHEC', e); process.exit(1); });
