import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8').trimEnd();
const pkg=JSON.parse(read('package.json'));
const version=pkg.version.split('-')[0];
const versionBadge=version.split('.').slice(0,2).join('.');
const isRc=/-rc(?:\.|$)/.test(pkg.version);
const display=`V${version}${isRc?' RC':''}`;
const manifest=JSON.parse(read('src/app/app.manifest.json'));
const shell=read('src/app/shell.html');
const appStyles=manifest.styles.map(p=>read('src/app/'+p)).join('\n\n');
let appBundle=manifest.scripts.map(p=>read('src/app/'+p)).join('\n\n');
appBundle=appBundle
  .replace(/APP_VERSION="\d+\.\d+\.\d+(?: RC)?"/,`APP_VERSION="${version}${isRc?' RC':''}"`)
  .replace(/RUNTIME_VERSION="\d+\.\d+\.\d+"/,`RUNTIME_VERSION="${version}"`)
  .replace(/RELEASE_CHANNEL="(?:rc|stable)"/,`RELEASE_CHANNEL="${isRc?'rc':'stable'}"`)
  .replace("content:'9.9'",`content:'${versionBadge}'`);
const sharedStyles=read('src/runtime/shared-styles.css');
const sharedRuntime=read('src/runtime/shared-core.js');
if(!sharedRuntime.includes(`const VERSION=${JSON.stringify(version)};`)){
  throw new Error(`Shared Runtime is stale for ${version}; run npm run build:runtime first`);
}
const portableShell=read('src/portable/shell.html')
  .replace('__PORTABLE_CSS__',read('src/portable/portable.css'))
  .replace('__PORTABLE_SHARED_STYLES__',sharedStyles);

const slots={
  '__MINDDECK_APP_STYLES__':appStyles,
  '__MINDDECK_SHARED_STYLES__':sharedStyles,
  '__MINDDECK_SHARED_RUNTIME__':sharedRuntime,
  '__MINDDECK_APP_BUNDLE__':appBundle,
};
for(const slot of Object.keys(slots)){
  const count=shell.split(slot).length-1;
  if(count!==1)throw new Error('build shell slot '+slot+' expected once, got '+count);
}
let out=shell.replace(/__MINDDECK_(?:APP_STYLES|SHARED_STYLES|SHARED_RUNTIME|APP_BUNDLE)__/g,slot=>slots[slot]);
out=out
  .replaceAll('MindDeck V9.7.0 RC',`MindDeck ${display}`)
  .replaceAll('Runtime 9.6.6',`Runtime ${version}`)
  .replaceAll('统一运行时 9.6.6 · Release Candidate',`统一运行时 ${version} · ${isRc?'Release Candidate':'Stable'}`)
  .replaceAll('发布候选 · 统一架构',`${isRc?'发布候选':'正式版'} · 统一架构`)
  .replaceAll(' - 发布候选版',isRc?' - 发布候选版':'');
const runtimeMarker='<!-- MINDDECK_SHARED_RUNTIME_START -->';
if(!out.includes(runtimeMarker))throw new Error('shared runtime marker missing');
out=out.replace(runtimeMarker,`<script type="text/plain" id="minddeck-portable-shell">\n${portableShell}\n</script>\n\n${runtimeMarker}`);
fs.writeFileSync(path.join(root,'index.html'),out+'\n');
console.log(`MindDeck ${display} standalone index.html built from package version ${pkg.version}`);
