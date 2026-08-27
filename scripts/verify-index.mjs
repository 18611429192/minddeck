import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const m = pkg.version.match(/^(\d+\.\d+\.\d+)(?:-rc(?:\.\d+)?)?$/);
if (!m) throw new Error('package version is neither stable nor RC semver');
const isRc = /-rc(?:\.|$)/.test(pkg.version);
const display = `MindDeck V${m[1]}${isRc ? ' RC' : ''}`;
if (!html.includes(display)) throw new Error(`index version mismatch: expected ${display}`);
if (!html.includes('<!DOCTYPE html') || !html.includes('</html>')) throw new Error('index structure incomplete');
if (!isRc && (html.includes('发布候选') || html.includes('Release Candidate'))) throw new Error('stable build still contains release-candidate labels');
if (isRc && !html.includes('发布候选')) throw new Error('RC build is missing release-candidate label');

const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)]
  .filter(m => !/type=["']text\/plain["']/i.test(m[1]))
  .map(m => m[2]);
if (scripts.length < 2) throw new Error('expected shared runtime and app scripts');
scripts.forEach((code, i) => new vm.Script(code, { filename: `index-script-${i+1}.js` }));
console.log(`index.html JavaScript syntax: OK (${scripts.length} executable scripts, ${display})`);
