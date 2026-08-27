import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('index.html'),exporter=read('src/app/modules/40-portable-export.js'),shell=read('src/portable/shell.html'),css=read('src/portable/portable.css');
for(const [name,marker] of [
  ['portable runtime placeholder','Portable Runtime __PORTABLE_RUNTIME_VERSION__'],
  ['map reflow control','id="reflowBtn"'],['expand all control','id="expandBtn"'],['collapse all control','id="collapseBtn"'],
  ['layout selector','id="layoutSel"'],['theme selector','id="themeSel"'],['TOC toggle','id="tocToggle"'],['fullscreen control','id="fullBtn"']
])assert.ok(shell.includes(marker),`Portable shell contract missing: ${name}`);
for(const [name,marker] of [
  ['shell consumer','document.getElementById("minddeck-portable-shell")'],
  ['single portable mount','MindDeckCore.Portable.mount({data,kind:KIND'],
  ['mindmap builder','function buildStandaloneMindmapHtml()'],['presentation builder','function buildStandaloneViewerHtml()'],['fusion builder','function buildStandaloneFusionHtml()'],
  ['safe title placeholder replacer',".replaceAll('__PORTABLE_TITLE__',()=>title)"],
  ['safe theme placeholder replacer',".replaceAll('__PORTABLE_THEME__',()=>portableTheme)"],
  ['safe runtime version placeholder replacer',".replaceAll('__PORTABLE_RUNTIME_VERSION__',()=>RUNTIME_VERSION)"],
  ['safe bootstrap placeholder replacer',".replace('__PORTABLE_BOOTSTRAP__',()=>bootstrap)"]
])assert.ok(exporter.includes(marker),`Portable exporter contract missing: ${name}`);
assert.ok(!/.replace\(['"]__PORTABLE_BOOTSTRAP__['"]\s*,\s*bootstrap\s*\)/.test(exporter),'Portable bootstrap must use a function replacer so Shared Runtime $ replacement tokens cannot corrupt generated JavaScript');
assert.ok(html.includes('id="minddeck-portable-shell"'),'built app does not embed Portable shell');
assert.ok(html.includes('function buildPortableData(kind){return ExportDataCore.project(data,kind)}'),'Portable export data does not use Shared Runtime');
assert.ok(css.length>3000,'Portable CSS was not extracted into a real source file');
assert.ok(!exporter.includes('<html lang='),'Portable document markup leaked back into exporter JS');
assert.ok(!exporter.includes('const doc=String.raw'),'Portable document template leaked back into exporter JS');
console.log('Portable export contracts: OK (shell + CSS extracted, runtime delegated, replacement-safe)');
