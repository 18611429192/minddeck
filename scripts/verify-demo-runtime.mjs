import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const demo=read('site/demo.html');
const adapter=read('src/app/modules/95-showcase.js');
const manifest=JSON.parse(read('src/app/app.manifest.json'));
for(const marker of ['const slides=','function visible(','function renderToc(','function step(','toggleSecurity']){
  assert.ok(!demo.includes(marker),'Pages demo reintroduced presentation logic: '+marker);
}
assert.ok(demo.includes("app.html?showcase=1"),'Demo must route to the real app showcase');
assert.ok(manifest.scripts.includes('modules/95-showcase.js'),'Showcase adapter missing from app manifest');
assert.ok(adapter.includes('fetch("./examples/demo.json"'),'Showcase must load the canonical demo project');
assert.ok(adapter.includes('enterPresentation({fullscreen:false})'),'Showcase must use the real presentation host');
assert.ok(adapter.includes('persistProjectNow=showcaseSaved'),'Showcase must not overwrite local project storage');
console.log('Demo/runtime unification: OK');
