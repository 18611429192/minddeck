import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8').trimEnd();
const manifest=JSON.parse(read('src/app/app.manifest.json'));
const shell=read('src/app/shell.html');
const appStyles=manifest.styles.map(p=>read('src/app/'+p)).join('\n\n');
const appBundle=manifest.scripts.map(p=>read('src/app/'+p)).join('\n\n');
const sharedStyles=read('src/runtime/shared-styles.css');
const sharedRuntime=read('src/runtime/shared-core.js');

const slots={
  '__MINDDECK_APP_STYLES__':appStyles,
  '__MINDDECK_SHARED_STYLES__':sharedStyles,
  '__MINDDECK_SHARED_RUNTIME__':sharedRuntime,
  '__MINDDECK_APP_BUNDLE__':appBundle,
};
let out=shell;
for(const [slot,value] of Object.entries(slots)){
  const count=out.split(slot).length-1;
  if(count!==1)throw new Error('build slot '+slot+' expected once, got '+count);
  out=out.replace(slot,value);
}
if(/__MINDDECK_[A-Z0-9_]+__/.test(out))throw new Error('unresolved MindDeck build slot');
fs.writeFileSync(path.join(root,'index.html'),out+'\n');
console.log('MindDeck V9.7 standalone index.html built from modular sources');
