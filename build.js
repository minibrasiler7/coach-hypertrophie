// Assemble la page : node build.js  ->  index.html à la racine (servi par GitHub Pages)
const fs = require('fs'), path = require('path');
const r = f => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');
const js = ['data.js', 'logic.js', 'ui.js'].map(r).join('\n');
if (js.includes('</script')) throw new Error('balise script dans le code');
const html = r('index.tpl.html').replace('/*CSS*/', () => r('style.css')).replace('/*JS*/', () => js);
fs.writeFileSync(path.join(__dirname, 'index.html'), html);
console.log('index.html', (html.length / 1024).toFixed(0) + ' Ko');
