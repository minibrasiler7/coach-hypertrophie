// Tests de la logique. Usage : node logic.test.js <dossier photos>
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const src = ['data.js', 'logic.js'].map(f => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8')).join('\n');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(src + '\nthis.API={MUSCLES,ZONES,EX,EXI,SLOTS,FALLBACK,TPL,CYCLES,SCIENCE,defaultState,planFor,pickExercise,buildSession,curItem,advance,logSet,actBusy,actAbsent,actPain,actChoose,actSkip,finishSession,recommend,setAdvice,warmups,volumeWeek,plannedWeek,buildReport,reportText,todayTpl,exHistory,estMinutes,alternatives,e1rm};', ctx);
const A = ctx.API, imgDir = process.argv[2];
let n = 0; const ok = (name, fn) => { fn(); n++; console.log('ok  ' + name); };
const DAY = 864e5, T0 = new Date(2026, 10, 2, 18, 0).getTime(); // lundi 2 novembre 2026

ok('données cohérentes', () => {
  const seen = {};
  for (const [slot, ids] of Object.entries(A.SLOTS)) for (const id of ids) {
    assert(A.EXI[id], 'exercice inconnu ' + id); assert.strictEqual(A.EXI[id].slot, slot, id + ' mal rangé');
    assert(!seen[id], 'doublon ' + id); seen[id] = 1;
  }
  for (const e of A.EX) {
    assert(seen[e.id], e.id + ' absent des créneaux'); assert(A.MUSCLES[e.m], e.id + ' muscle');
    for (const m of [...e.s, ...(e.full || [])]) assert(A.MUSCLES[m], e.id + ' muscle ' + m);
    for (const z of Object.keys(e.j)) assert(A.ZONES[z], e.id + ' zone ' + z);
    assert.strictEqual(e.cues.length, 3, e.id + ' consignes');
    if (imgDir) for (const k of [0, 1]) assert(fs.existsSync(path.join(imgDir, e.img, k + '.jpg')), 'photo manquante ' + e.img);
  }
  for (const [id, t] of Object.entries(A.TPL)) for (const it of t.items) {
    assert(A.SLOTS[it.slot], id + ' créneau ' + it.slot); if (it.pref) assert(A.EXI[it.pref], id + ' pref ' + it.pref);
  }
  for (const c of Object.values(A.CYCLES)) for (const id of c) assert(A.TPL[id], 'séance ' + id);
  for (const sl of Object.keys(A.SLOTS)) for (const f of A.FALLBACK[sl]) assert(A.SLOTS[f], 'fallback ' + f);
  console.log('    ' + A.EX.length + ' exercices, ' + Object.keys(A.TPL).length + ' séances types');
});

ok('volume prévu par semaine', () => {
  for (const d of [2, 3, 4, 5, 6]) {
    const S = A.defaultState(); S.profile.days = d;
    const v = A.plannedWeek(S);
    console.log('    ' + d + ' j/sem : ' + Object.entries(v).map(([m, x]) => m + ' ' + x).join(', '));
    if (d >= 4) for (const m of ['pecs', 'dos', 'epaules', 'quads', 'ischios', 'biceps', 'triceps']) assert(v[m] >= 10, d + 'j ' + m + ' < 10 : ' + v[m]);
  }
});

const mk = (S, t, exId, sets, light) => S.sessions.push({ id: String(t), tplId: 'UA', name: 'x', start: t, end: t + 36e5, pain: {}, items: [{ exId, key: 'UA|0', slot: A.EXI[exId].slot, tg: { sets: 3, lo: 6, hi: 10 }, sets, light: !!light, swap: null }] });
const tg = { sets: 3, lo: 6, hi: 10 };

ok('charge : première fois', () => {
  const S = A.defaultState(), r = A.recommend(S, A.EXI.dc_halt, tg, false, T0);
  assert.strictEqual(r.kind, 'first'); assert.strictEqual(r.w, 14);
});
ok('charge : même charge, +1 rép', () => {
  const S = A.defaultState(); mk(S, T0, 'dc_halt', [{ w: 30, r: 9 }, { w: 30, r: 8 }, { w: 30, r: 7 }]);
  const r = A.recommend(S, A.EXI.dc_halt, tg, false, T0 + 3 * DAY);
  assert.strictEqual(r.kind, 'hold'); assert.strictEqual(r.w, 30); assert.deepStrictEqual(Array.from(r.per), [10, 9, 8]);
  assert.strictEqual(A.setAdvice(S, A.EXI.dc_halt, r, []).r, 10);
});
ok('charge : on monte quand le haut de fourchette est atteint', () => {
  const S = A.defaultState(); mk(S, T0, 'dc_halt', [{ w: 30, r: 10, rir: 1 }, { w: 30, r: 10, rir: 1 }, { w: 30, r: 10, rir: 0 }]);
  const r = A.recommend(S, A.EXI.dc_halt, tg, false, T0 + 3 * DAY);
  assert.strictEqual(r.kind, 'up'); assert.strictEqual(r.w, 32);
  const a = A.setAdvice(S, A.EXI.dc_halt, r, []); assert(a.r >= 6 && a.r <= 10, 'reps ' + a.r);
  const S2 = A.defaultState(); mk(S2, T0, 'dc_halt', [{ w: 30, r: 10, rir: 3 }, { w: 30, r: 10, rir: 3 }, { w: 30, r: 10, rir: 3 }]);
  assert.strictEqual(A.recommend(S2, A.EXI.dc_halt, tg, false, T0 + 3 * DAY).w, 34); // beaucoup de marge : deux crans
});
ok('charge : on descend si trop lourd', () => {
  const S = A.defaultState(); mk(S, T0, 'dc_barre', [{ w: 80, r: 4 }, { w: 80, r: 3 }]);
  const r = A.recommend(S, A.EXI.dc_barre, tg, false, T0 + 3 * DAY);
  assert.strictEqual(r.kind, 'down'); assert(r.w < 80 && r.w >= 70, 'w ' + r.w);
});
ok('charge : reprise après une longue pause', () => {
  const S = A.defaultState(); mk(S, T0, 'presse', [{ w: 200, r: 8 }, { w: 200, r: 8 }]);
  const r = A.recommend(S, A.EXI.presse, tg, false, T0 + 30 * DAY);
  assert.strictEqual(r.kind, 'return'); assert.strictEqual(r.w, 180);
});
ok('charge : plateau détecté après 3 séances sans progrès', () => {
  const S = A.defaultState();
  for (let i = 0; i < 3; i++) mk(S, T0 + i * 4 * DAY, 'dc_halt', [{ w: 30, r: 8 }, { w: 30, r: 8 }, { w: 30, r: 7 }]);
  assert.strictEqual(A.recommend(S, A.EXI.dc_halt, tg, false, T0 + 14 * DAY).plateau, true);
  mk(S, T0 + 13 * DAY, 'dc_halt', [{ w: 30, r: 10 }, { w: 30, r: 9 }, { w: 30, r: 8 }]);
  assert.strictEqual(A.recommend(S, A.EXI.dc_halt, tg, false, T0 + 16 * DAY).plateau, false);
});
ok('charge : version douce = -30 % et 15-20 reps, sans polluer la suite', () => {
  const S = A.defaultState(); mk(S, T0, 'dc_halt', [{ w: 30, r: 9 }, { w: 30, r: 8 }]);
  const r = A.recommend(S, A.EXI.dc_halt, tg, true, T0 + 3 * DAY);
  assert.strictEqual(r.kind, 'light'); assert.strictEqual(r.w, 20); assert.strictEqual(r.lo, 15); assert.strictEqual(r.hi, 20);
  mk(S, T0 + 3 * DAY, 'dc_halt', [{ w: 20, r: 20 }, { w: 20, r: 20 }], true);
  const back = A.recommend(S, A.EXI.dc_halt, tg, false, T0 + 6 * DAY);
  assert.strictEqual(back.w, 30); assert.strictEqual(back.kind, 'hold');
});
ok('série suivante : baisse si sous la fourchette, monte si trop facile', () => {
  const S = A.defaultState(), ex = A.EXI.chest_press, rec = A.recommend(S, ex, tg, false, T0);
  assert.strictEqual(A.setAdvice(S, ex, rec, [{ w: 60, r: 4 }]).w, 55);
  assert.strictEqual(A.setAdvice(S, ex, rec, [{ w: 60, r: 2 }]).w, 50);
  assert.strictEqual(A.setAdvice(S, ex, rec, [{ w: 60, r: 13, rir: 3 }]).w, 65);
  assert.strictEqual(A.setAdvice(S, ex, rec, [{ w: 60, r: 9, rir: 1 }]).w, 60);
});
ok('échauffement', () => {
  const S = A.defaultState(), w = A.warmups(S, A.EXI.dc_barre, 80);
  assert.deepStrictEqual(Array.from(w, x => x.w), [40, 60]); assert.strictEqual(A.warmups(S, A.EXI.curl_ez, 30).length, 0);
});

ok('douleur : remplace par un exercice doux', () => {
  const S = A.defaultState(); S.pain = { ep: 2 };
  const cur = A.buildSession(S, 'UA', T0), ids = cur.items.map(i => i.exId);
  console.log('    épaule : ' + ids.join(', '));
  assert.strictEqual(ids[0], 'chest_press'); assert.strictEqual(ids[2], 'di_machine'); assert.strictEqual(ids[3], 'tirage_neutre');
  assert.strictEqual(ids[4], 'lat_scaption');
  for (const it of cur.items) if (it.state !== 'skip') assert((A.EXI[it.exId].j.ep || 0) <= 1, it.exId);
  const S2 = A.defaultState(); S2.pain = { ge: 2 };
  const c2 = A.buildSession(S2, 'LA', T0); console.log('    genou : ' + c2.items.map(i => i.exId + (i.state === 'skip' ? '(passé)' : '')).join(', '));
  assert.strictEqual(c2.items[0].exId, 'squat_banc'); assert.strictEqual(c2.items[2].exId, 'fente_arriere');
  const S3 = A.defaultState(); S3.pain = { ch: 1 };
  const c3 = A.buildSession(S3, 'LA', T0); const calf = c3.items[4];
  assert.strictEqual(calf.light, true); assert.strictEqual(calf.state, 'todo');
  S3.pain = { ch: 2 }; assert.strictEqual(A.buildSession(S3, 'LA', T0).items[4].state, 'skip');
  const S4 = A.defaultState(); S4.pain = { do: 2 };
  const c4 = A.buildSession(S4, 'LA', T0); console.log('    bas du dos : ' + c4.items.map(i => i.exId).join(', '));
  assert.strictEqual(c4.items[1].exId, 'pull_through'); assert.strictEqual(c4.items[5].exId, 'releve_genoux');
});

ok('machine absente : retenue pour les prochaines fois', () => {
  const S = A.defaultState(); S.cur = A.buildSession(S, 'LA', T0);
  assert.strictEqual(A.curItem(S.cur).exId, 'presse');
  const r = A.actAbsent(S);
  assert.strictEqual(A.curItem(S.cur).exId, 'hack'); assert.strictEqual(r.changes.length, 1);
  assert(S.unavail['st:legpress']);
  S.cur = null; const c = A.buildSession(S, 'LA', T0 + DAY);
  assert.strictEqual(c.items[0].exId, 'hack');
  assert(!c.items.some(i => i.exId === 'mollets_presse'));
  const S2 = A.defaultState(); S2.cur = A.buildSession(S2, 'UA', T0); A.actAbsent(S2);
  assert(S2.unavail['ex:dc_halt'] && !S2.unavail['st:dumbbell']); assert.strictEqual(A.curItem(S2.cur).exId, 'chest_press');
});

ok('machine occupée : on fait le suivant puis on revient ; 2e fois = remplacement du jour', () => {
  const S = A.defaultState(); S.cur = A.buildSession(S, 'LA', T0); const cur = S.cur;
  const r = A.actBusy(S);
  assert.strictEqual(r.type, 'defer'); assert.strictEqual(A.curItem(cur).exId, 'sdt_roumain');
  assert.strictEqual(cur.items[cur.order[cur.pos + 1]].exId, 'presse');
  for (let i = 0; i < 3; i++) A.logSet(S, { w: 60, r: 10 }, T0);
  assert(A.advance(cur)); assert.strictEqual(A.curItem(cur).exId, 'presse'); assert.strictEqual(A.curItem(cur).deferred, 1);
  const r2 = A.actBusy(S);
  assert.strictEqual(r2.type, 'replace'); assert.strictEqual(A.curItem(cur).exId, 'hack'); assert(!S.unavail['st:legpress']);
  assert.strictEqual(A.curItem(cur).planId, 'presse');
  S.cur = null; assert.strictEqual(A.buildSession(S, 'LA', T0 + DAY).items[0].exId, 'presse'); // la presse reste au programme
});

ok('douleur signalée en cours de séance', () => {
  const S = A.defaultState(); S.cur = A.buildSession(S, 'UA', T0);
  A.logSet(S, { w: 30, r: 8 }, T0);
  const ch = A.actPain(S, { ep: 2 });
  assert(ch.some(c => c.type === 'stop' && c.current)); assert.strictEqual(S.cur.items[0].state, 'done');
  assert.strictEqual(S.cur.items[2].exId, 'di_machine'); assert.strictEqual(S.cur.items[4].exId, 'lat_scaption');
  A.actPain(S, {}); assert.strictEqual(S.cur.items[2].exId, 'di_halt'); // douleur retirée : retour au plan
});

ok('séance complète, rotation et rapport', () => {
  const S = A.defaultState(); S.profile.bw = 80; let now = T0;
  const order = [];
  for (let k = 0; k < 6; k++) {
    const tpl = A.todayTpl(S); order.push(tpl);
    S.cur = A.buildSession(S, tpl, now);
    do {
      const it = A.curItem(S.cur), ex = A.EXI[it.exId], rec = A.recommend(S, ex, it.tg, it.light, now);
      for (let s = it.sets.length; s < it.tg.sets; s++) {
        const a = A.setAdvice(S, ex, rec, it.sets);
        A.logSet(S, { w: a.w, r: Math.min(rec.hi, a.r + (k >= 4 ? 1 : 0)), rir: 1 }, now);
      }
    } while (A.advance(S.cur));
    const se = A.finishSession(S, now + 65 * 6e4); assert(se);
    const rep = A.buildReport(S, se);
    if (k === 0) { assert.strictEqual(rep.verdict, 'Séance de référence'); assert.strictEqual(rep.nSets, 21); }
    if (k === 4) {
      console.log('    ' + rep.name + ' : ' + rep.verdict + ', ' + rep.nSets + ' séries, ' + rep.ton + ' kg, ' + rep.up + ' en hausse / ' + rep.cmp + ', records ' + rep.prs);
      assert(rep.cmp === 7, 'comparaisons ' + rep.cmp); assert(rep.up >= 4, 'hausse ' + rep.up);
      const txt = A.reportText(rep, 'Bas du corps A'); assert(txt.includes('Prochaine séance : Bas du corps A')); assert(txt.includes('Protéines : vise environ 128 g'));
    }
    now += 2 * DAY;
  }
  assert.deepStrictEqual(order, ['UA', 'LA', 'UB', 'LB', 'UA', 'LA']);
  const v = A.volumeWeek(S, T0); console.log('    semaine 1 (4 séances) : ' + Object.entries(v).map(([m, x]) => m + ' ' + x).join(', '));
  assert.strictEqual(v.pecs, 12); assert.strictEqual(v.dos, 12);
});

ok('séance sans aucune série : non enregistrée', () => {
  const S = A.defaultState(); S.cur = A.buildSession(S, 'UA', T0);
  assert.strictEqual(A.finishSession(S, T0 + 1000), null); assert.strictEqual(S.sessions.length, 0); assert.strictEqual(S.rot, 0);
});
console.log('\n' + n + ' tests réussis');
