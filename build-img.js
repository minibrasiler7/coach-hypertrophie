// Fabrique une image par exercice : deux photos (départ, arrivée) côte à côte.
// Usage : NODE_PATH=... node build-img.js <dossier photos source> <dossier de sortie>
const fs = require('fs'), path = require('path'), vm = require('vm'), sharp = require('sharp');
const [srcDir, outDir] = process.argv.slice(2);
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'src', 'data.js'), 'utf8') + '\nthis.EX=EX;', ctx);
fs.mkdirSync(outDir, { recursive: true });
const W = 480, H = 320;
(async () => {
  let total = 0;
  for (const e of ctx.EX) {
    const frames = await Promise.all([0, 1].map(k =>
      sharp(path.join(srcDir, e.img, k + '.jpg')).resize(W, H, { fit: 'cover' }).toBuffer()));
    const out = path.join(outDir, e.id + '.jpg');
    await sharp({ create: { width: W * 2, height: H, channels: 3, background: '#000' } })
      .composite([{ input: frames[0], left: 0, top: 0 }, { input: frames[1], left: W, top: 0 }])
      .jpeg({ quality: 62, mozjpeg: true }).toFile(out);
    total += fs.statSync(out).size;
  }
  console.log(ctx.EX.length + ' images, ' + (total / 1048576).toFixed(2) + ' Mo');
})();
