// Liste les phrases à enregistrer : node tools/voice-texts.js > textes.json
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', 'data.js'), 'utf8') + '\nthis.D={EX,COACH};', ctx);
const packs = { coach: {} };
for (const [k, arr] of Object.entries(ctx.D.COACH)) arr.forEach((t, i) => { packs.coach[k + i] = t; });
for (const e of ctx.D.EX) packs[e.id] = { n: (e.say || e.n) + '.', t1: e.cues[1], t2: e.cues[2] };
process.stdout.write(JSON.stringify(packs, null, 1));
