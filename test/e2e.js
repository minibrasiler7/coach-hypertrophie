// Parcours complet dans un navigateur, format téléphone. Usage : node e2e.js <url> <dossier captures>
const { chromium } = require('playwright');
const [url, out] = process.argv.slice(2);
const assert = require('assert');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'fr-CH', timezoneId: 'Europe/Zurich', colorScheme: 'light' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('requestfailed', r => { if (!/fonts\.g/.test(r.url())) errors.push('requête échouée: ' + r.url()); });
  const shot = (n, full) => page.screenshot({ path: out + '/' + n + '.png', fullPage: !!full });
  const act = a => page.click('[data-act="' + a + '"]');
  const exName = () => page.textContent('.exname');
  const toastTxt = async () => (await page.textContent('#toast')) || '';
  const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('coach-hypertrophie-v1')));

  await page.goto(url); await page.waitForSelector('.title');
  assert.strictEqual(await page.textContent('.title'), 'Haut du corps A');
  await page.waitForTimeout(600); await shot('01-accueil', true);

  // --- Séance 1
  await act('start'); await page.waitForSelector('.exname');
  assert.strictEqual(await exName(), 'Développé couché haltères');
  await page.waitForTimeout(500); await shot('02-seance', true);
  for (let i = 0; i < 8; i++) await page.click('[data-act="step"][data-k="w"][data-d="1"]');   // 14 -> 30 kg
  assert.strictEqual(await page.inputValue('#in-w'), '30');
  await page.fill('#in-r', '9'); await page.click('[data-act="rir"][data-v="1"]');
  await act('logset'); await page.waitForSelector('.rest');
  await shot('03-repos', false);
  await act('restskip');
  assert.strictEqual(await page.inputValue('#in-w'), '30');
  await page.fill('#in-r', '8'); await act('logset'); await act('restskip');
  await page.fill('#in-r', '7'); await act('logset');          // 3e série : exercice suivant, repos affiché
  assert.strictEqual(await exName(), 'Rowing assis à la poulie');
  await act('restskip');

  // Machine occupée : on passe au suivant, l'exercice revient juste après
  await act('busy');
  assert.strictEqual(await exName(), 'Développé incliné haltères');
  assert((await toastTxt()).includes('Je te repropose « Rowing assis à la poulie »'), await toastTxt());
  for (const r of ['10', '9', '8']) { await page.fill('#in-r', r); await act('logset'); if (await page.$('[data-act="restskip"]')) await act('restskip'); }
  assert.strictEqual(await exName(), 'Rowing assis à la poulie');
  assert(await page.$('.banner'), 'bandeau de retour absent');
  await shot('04-retour-machine', false);
  await act('busy');                                            // toujours occupée : remplacement du jour
  assert.strictEqual(await exName(), 'Rowing machine, poitrine en appui');
  for (const r of ['12', '11', '10']) { await page.fill('#in-r', r); await act('logset'); if (await page.$('[data-act="restskip"]')) await act('restskip'); }

  // Machine absente
  assert.strictEqual(await exName(), 'Tirage vertical prise large');
  await act('absent');
  assert.strictEqual(await exName(), 'Tractions');
  assert((await state()).unavail['st:latpull'] === 1);
  for (const r of ['8', '7', '6']) { await page.fill('#in-r', r); await act('logset'); if (await page.$('[data-act="restskip"]')) await act('restskip'); }

  // Douleur à l'épaule
  assert.strictEqual(await exName(), 'Élévations latérales haltères');
  await act('pain'); await page.waitForSelector('#sheet.on');
  await page.click('[data-act="painset"][data-z="ep"][data-v="2"]');
  await shot('05-douleur', false);
  await act('painok');
  assert.strictEqual(await exName(), 'Élévations dans le plan de l\'omoplate');
  await page.waitForTimeout(300); await shot('06-adapte', true);

  // Autre exercice, puis fin de séance
  for (const r of ['15', '14', '13']) { await page.fill('#in-r', r); await act('logset'); if (await page.$('[data-act="restskip"]')) await act('restskip'); }
  await act('alt'); await page.waitForSelector('#sheet.on'); await shot('07-autre-exercice', false); await page.click('.box .btn[data-act="close"]');
  let guard = 0;
  while (await page.$('.exname') && guard++ < 40) {
    if (await page.$('[data-act="restskip"]')) { await act('restskip'); continue; }
    await page.fill('#in-r', '12'); await act('logset');
  }
  await page.waitForSelector('.tiles');
  assert((await page.textContent('.title')).includes('Séance de référence'));
  await page.waitForTimeout(300); await shot('08-rapport', true);
  let st = await state();
  assert.strictEqual(st.sessions.length, 1); assert.strictEqual(st.rot, 1); assert.strictEqual(st.cur, null);
  console.log('séance 1 :', st.sessions[0].items.map(i => i.exId + ' ' + i.sets.map(s => s.w + 'x' + s.r).join('/')).join(' | '));

  // --- Séance 2 trois jours plus tard, même séance : les charges viennent de l'historique
  await page.evaluate(() => { const k = 'coach-hypertrophie-v1', s = JSON.parse(localStorage.getItem(k)); s.sessions.forEach(x => { x.start -= 3 * 864e5; x.end -= 3 * 864e5; x.items.forEach(i => i.sets.forEach(t => t.t -= 3 * 864e5)); }); s.rot = 0; s.pain = {}; localStorage.setItem(k, JSON.stringify(s)); });
  await page.reload(); await page.waitForSelector('.title');
  await page.waitForTimeout(400); await shot('09-accueil-2', true);
  await act('start'); await page.waitForSelector('.exname');
  assert.strictEqual(await exName(), 'Développé couché haltères');
  assert.strictEqual(await page.inputValue('#in-w'), '30'); assert.strictEqual(await page.inputValue('#in-r'), '10');
  assert((await page.textContent('.why')).includes('Vise une de plus'));
  await page.waitForTimeout(300); await shot('10-seance-2', false);
  guard = 0;
  while (await page.$('.exname') && guard++ < 80) {
    if (await page.$('[data-act="restskip"]')) { await act('restskip'); continue; }
    await act('logset');                                        // valide la charge et les répétitions proposées
  }
  await page.waitForSelector('.tiles');
  console.log('rapport 2 :', await page.textContent('.title'), '|', (await page.textContent('.tiles')).replace(/\s+/g, ' '));
  await page.waitForTimeout(300); await shot('11-rapport-2', true);
  st = await state(); assert.strictEqual(st.sessions.length, 2);

  // --- Autres onglets, thème sombre
  await page.click('[data-act="tab"][data-v="progress"]'); await page.waitForTimeout(300); await shot('12-progres', true);
  await page.click('[data-act="tab"][data-v="science"]'); await page.waitForTimeout(200); await shot('13-science', false);
  await page.click('[data-act="tab"][data-v="settings"]'); await page.waitForTimeout(200); await shot('14-reglages', true);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.click('[data-act="tab"][data-v="home"]'); await act('start'); await page.waitForSelector('.exname'); await page.waitForTimeout(300); await shot('15-sombre', false);
  await act('quit'); await act('abandon');

  // Débordement horizontal ?
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  assert(!overflow, 'débordement horizontal');
  await browser.close();
  if (errors.length) { console.log('ERREURS\n' + errors.join('\n')); process.exit(1); }
  console.log('parcours complet OK, aucune erreur de page');
})().catch(e => { console.error('ÉCHEC', e); process.exit(1); });
