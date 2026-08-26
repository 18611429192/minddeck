import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8').trimEnd();
const pkg=JSON.parse(read('package.json'));
const version=pkg.version.split('-')[0];
const isRc=/-rc(?:\.|$)/.test(pkg.version);
const display=`V${version}${isRc?' RC':''}`;
const manifest=JSON.parse(read('src/app/app.manifest.json'));
const shell=read('src/app/shell.html');
const appStyles=manifest.styles.map(p=>read('src/app/'+p)).join('\n\n');
let appBundle=manifest.scripts.map(p=>read('src/app/'+p)).join('\n\n');
appBundle=appBundle
  .replace(/APP_VERSION="\d+\.\d+\.\d+(?: RC)?"/,`APP_VERSION="${version}${isRc?' RC':''}"`)
  .replace(/RUNTIME_VERSION="\d+\.\d+\.\d+"/,`RUNTIME_VERSION="${version}"`)
  .replace(/RELEASE_CHANNEL="(?:rc|stable)"/,`RELEASE_CHANNEL="${isRc?'rc':'stable'}"`);
const sharedStyles=read('src/runtime/shared-styles.css');
let sharedRuntime=read('src/runtime/shared-core.js');
sharedRuntime=sharedRuntime.replace(/const VERSION='[^']+';/,`const VERSION='${version}';`);
const portableShell=read('src/portable/shell.html')
  .replace('__PORTABLE_CSS__',read('src/portable/portable.css'))
  .replace('__PORTABLE_SHARED_STYLES__',sharedStyles);

const slots={
  '__MINDDECK_APP_STYLES__':appStyles,
  '__MINDDECK_SHARED_STYLES__':sharedStyles,
  '__MINDDECK_SHARED_RUNTIME__':sharedRuntime,
  '__MINDDECK_APP_BUNDLE__':appBundle,
};
let out=shell
  .replaceAll('MindDeck V9.7.0 RC',`MindDeck ${display}`)
  .replaceAll('Runtime 9.6.6',`Runtime ${version}`);
const runtimeMarker='<!-- MINDDECK_SHARED_RUNTIME_START -->';
if(!out.includes(runtimeMarker))throw new Error('shared runtime marker missing');
out=out.replace(runtimeMarker,`<script type="text/plain" id="minddeck-portable-shell">\n${portableShell}\n</script>\n\n${runtimeMarker}`);
for(const [slot,value] of Object.entries(slots)){
  const count=out.split(slot).length-1;
  if(count!==1)throw new Error('build slot '+slot+' expected once, got '+count);
  out=out.replace(slot,value);
}
if(/__MINDDECK_[A-Z0-9_]+__/.test(out))throw new Error('unresolved MindDeck build slot');
fs.writeFileSync(path.join(root,'index.html'),out+'\n');
console.log(`MindDeck ${display} standalone index.html built from package version ${pkg.version}`);
