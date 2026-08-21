import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const m = pkg.version.match(/^(\d+\.\d+\.\d+)-rc/);
if (!m) throw new Error('package version is not RC');
const display = `MindDeck V${m[1]} RC`;
if (!html.includes(display)) throw new Error(`index version mismatch: expected ${display}`);
if (!html.includes('<!DOCTYPE html') || !html.includes('</html>')) throw new Error('index structure incomplete');

const scripts = [...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]);
if (scripts.length < 2) throw new Error('expected shared runtime and app scripts');
scripts.forEach((code, i) => new vm.Script(code, { filename: `index-script-${i+1}.js` }));
console.log(`index.html JavaScript syntax: OK (${scripts.length} scripts)`);
