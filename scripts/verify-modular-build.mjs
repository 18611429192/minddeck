import fs from 'node:fs';
import assert from 'node:assert/strict';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const shell=fs.readFileSync(new URL('../src/app/shell.html',import.meta.url),'utf8');
const manifest=JSON.parse(fs.readFileSync(new URL('../src/app/app.manifest.json',import.meta.url),'utf8'));
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const version=pkg.version.split('-')[0],isRc=/-rc(?:\.|$)/.test(pkg.version);
const read=p=>fs.readFileSync(new URL('../src/app/'+p,import.meta.url),'utf8').trimEnd();
let runtime=fs.readFileSync(new URL('../src/runtime/shared-core.js',import.meta.url),'utf8').trimEnd();
runtime=runtime.replace(/const VERSION='[^']+';/,`const VERSION='${version}';`);
const sharedStyles=fs.readFileSync(new URL('../src/runtime/shared-styles.css',import.meta.url),'utf8').trimEnd();
let appBundle=manifest.scripts.map(read).join('\n\n');
appBundle=appBundle
  .replace(/APP_VERSION="\d+\.\d+\.\d+(?: RC)?"/,`APP_VERSION="${version}${isRc?' RC':''}"`)
  .replace(/RUNTIME_VERSION="\d+\.\d+\.\d+"/,`RUNTIME_VERSION="${version}"`)
  .replace(/RELEASE_CHANNEL="(?:rc|stable)"/,`RELEASE_CHANNEL="${isRc?'rc':'stable'}"`);
const appStyles=manifest.styles.map(read).join('\n\n');
for(const slot of ['__MINDDECK_APP_STYLES__','__MINDDECK_SHARED_STYLES__','__MINDDECK_SHARED_RUNTIME__','__MINDDECK_APP_BUNDLE__']) assert.ok(shell.includes(slot),'shell slot missing: '+slot);
assert.ok(manifest.scripts.length>=7,'application source was not meaningfully modularized');
assert.ok(manifest.styles.length>=5,'application CSS was not meaningfully modularized');
const take=(re,label)=>{const m=html.match(re);assert.ok(m,label+' missing');return m[1].trimEnd()};
assert.equal(take(/<style id="minddeck-app-styles">\s*([\s\S]*?)\s*<\/style>/,'app styles'),appStyles,'generated app styles drifted');
assert.equal(take(/<!-- MINDDECK_SHARED_STYLES_START -->\s*<style id="minddeck-shared-styles">\s*([\s\S]*?)\s*<\/style>/,'shared styles'),sharedStyles,'generated shared styles drifted');
assert.equal(take(/<!-- MINDDECK_SHARED_RUNTIME_START -->\s*<script id="minddeck-shared-runtime">\s*([\s\S]*?)\s*<\/script>/,'shared runtime'),runtime,'generated shared runtime drifted');
assert.equal(take(/<script id="minddeck-app-bundle">\s*([\s\S]*?)\s*<\/script>/,'app bundle'),appBundle,'generated app bundle drifted');
console.log(`V${version} source/build parity: OK`);
