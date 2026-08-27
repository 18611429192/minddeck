import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('index.html');
const runtimeSource=read('src/runtime/shared-core.js').trimEnd();
const styles=read('src/runtime/shared-styles.css').trimEnd();
const exporter=read('src/app/modules/40-portable-export.js');
const smartCompose=read('src/app/modules/25-smart-compose.js');
const portableShell=read('src/portable/shell.html');
const pkg=JSON.parse(read('package.json'));
const version=pkg.version.split('-')[0];

const runtimeMatch=html.match(/<!-- MINDDECK_SHARED_RUNTIME_START -->\s*<script id="minddeck-shared-runtime">\s*([\s\S]*?)\s*<\/script>\s*<!-- MINDDECK_SHARED_RUNTIME_END -->/);
const stylesMatch=html.match(/<!-- MINDDECK_SHARED_STYLES_START -->\s*<style id="minddeck-shared-styles">\s*([\s\S]*?)\s*<\/style>\s*<!-- MINDDECK_SHARED_STYLES_END -->/);
assert.ok(runtimeMatch,'embedded shared runtime missing');
assert.ok(stylesMatch,'embedded shared styles missing');
assert.equal(runtimeMatch[1].trimEnd(),runtimeSource,'index embedded runtime drifted from generated Shared Runtime');
assert.equal(stylesMatch[1].trimEnd(),styles,'index embedded styles drifted from src/runtime/shared-styles.css');
assert.ok(runtimeSource.includes(`const VERSION=${JSON.stringify(version)};`),'generated runtime version drifted from package.json');
assert.ok(html.includes('type="text/plain" id="minddeck-portable-shell"'),'Portable shell is not embedded in the standalone app');

const runtimeModules=['env.js','model.js','composer.js','platform.js','slide.js','view.js','portable.js'];
for(const file of runtimeModules){
  const code=read('src/runtime/modules/'+file);
  assert.match(code,/\bexport\s+(?:const|function|class)\b/,`runtime module has no ESM export: ${file}`);
}
for(const file of runtimeModules.slice(1))assert.match(read('src/runtime/modules/'+file),/^import\s/m,`runtime module has no explicit dependency imports: ${file}`);
const modelSource=read('src/runtime/modules/model.js');
const composerSource=read('src/runtime/modules/composer.js');
assert.ok(!/\b(?:document|window)\b/.test(modelSource),'model layer must not depend on browser DOM APIs');
assert.ok(!/\b(?:document|window)\b/.test(composerSource),'composer business layer must not depend on browser DOM APIs');
assert.ok(!runtimeSource.includes('export const '),'generated browser runtime still contains ESM syntax');

const mainScripts=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)]
  .filter(m=>!/type=["']text\/plain["']/i.test(m[1]))
  .map(m=>m[2]);
assert.ok(mainScripts.length>=2,'expected shared runtime + app script');
const app=mainScripts.at(-1);

const required=[
  ['main map uses shared renderer','MapRendererCore.render(data,{'],
  ['main map editing uses shared inline editor','InlineEditorCore.start({'],
  ['main map commands use shared dispatcher','CommandsCore.applyMapAction(data,selectedNodeId,action'],
  ['main presentation uses shared view','PresentationViewCore.create({'],
  ['main presentation delegates TOC to shared view','function renderToc(){return presentationView?.renderToc()}'],
  ['main presentation delegates slide render to shared view','function renderPresentSlide(){return presentationView?.render()}'],
  ['main diagnostics use shared core','DiagnosticsCore.inspect(data,{'],
  ['main recovery uses shared core','RecoveryCore.historyLimitForBytes('],
  ['portable export data uses shared core','ExportDataCore.project(data,kind)'],
  ['node defaults use shared slide model','SlideCore.defaultElementsForNode(n,{uid:()=>IdsCore.create("e_",8)})'],
  ['layer ranges use shared constants','const {MASTER_Z_MIN,MASTER_Z_MAX,SLIDE_Z_MIN,SLIDE_Z_MAX}=Core.RANGES;'],
  ['showcase uses app presentation host','enterPresentation({fullscreen:false})'],
  ['smart compose delegates to shared Composer','const ComposerV99=Core.Composer;'],
  ['smart compose creates native project data','ComposerV99.compose(raw,{'],
];
for(const [name,marker] of required)assert.ok(app.includes(marker),`${name} missing`);
assert.ok(runtimeSource.includes('const presentationView=PresentationView.create({'),'portable presentation does not use shared PresentationView');

for(const re of [
  /function\s+subtreeWeight\s*\(/,/function\s+layoutHorizontalBranches\s*\(/,/function\s+layoutDownBranches\s*\(/,
  /function\s+layoutRadialBranches\s*\(/,/function\s+presentationOrder\s*\(/,/function\s+resolvePresentationIndex\s*\(/,
  /function\s+renderPresentElement\s*\(/,/let\s+presentationWheelLocked\b/,/let\s+presentTouchStart\b/,
  /function\s+baseText\s*\(/,/function\s+baseShape\s*\(/,/function\s+extractMindmapData\s*\(/
])assert.ok(!re.test(app),`duplicate app business implementation reintroduced: ${re}`);

assert.ok(!/function\s+(?:buildSlideElements|inferRole|parseMarkdown|parseIndented)\s*\(/.test(smartCompose),'smart compose UI copied Composer business rules into app layer');
assert.ok(smartCompose.includes('ComposerV99.relayoutNode('),'page designer does not delegate relayout to shared Composer');
assert.ok(smartCompose.includes('ComposerV99.rethemeProject('),'page designer does not delegate theme changes to shared Composer');

assert.ok(exporter.includes('document.getElementById("minddeck-portable-shell")'),'Portable exporter does not consume the extracted shell');
assert.ok(exporter.includes('MindDeckCore.Portable.mount({data,kind:KIND'),'Portable exporter does not delegate to shared Portable runtime');
assert.ok(!exporter.includes('const doc=String.raw`<!DOCTYPE html>'),'Portable HTML shell was copied back into JS');
for(const marker of ['function renderMap(','function renderToc(','function autoLayout(','function rebuildPresentation(','function inlineEdit(','function fitStage(']){
  assert.ok(!exporter.includes(marker),'Portable exporter reintroduced business rendering: '+marker);
  assert.ok(!portableShell.includes(marker),'Portable shell contains executable business logic: '+marker);
}

const demo=read('site/demo.html');
for(const marker of ['const slides=','function visible(','function renderToc(','function step(','toggleSecurity'])assert.ok(!demo.includes(marker),'Pages Demo reintroduced a second implementation: '+marker);
assert.ok(demo.includes('app.html?showcase=1'),'Pages Demo must enter the real application showcase');

const adapters=['src/core/ids.js','src/core/tree.js','src/core/layout.js','src/core/presentation.js','src/core/project.js','src/core/commands.js','src/core/composer.js','src/core/recovery.js','src/core/diagnostics.js'];
for(const path of adapters){const code=read(path);assert.ok(code.includes("from './runtime.js'"),`${path} is not a shared-core adapter`);assert.ok(!/\bfunction\s+[A-Za-z_$]/.test(code),`${path} contains a second function implementation`)}

const singleSources=['Ids','Tree','Project','Layout','Commands','Presentation','PresentationSession','Composer','Stage','MapViewport','Animation','Element','Slide','Fullscreen','Input','Recovery','Diagnostics','InlineEditor','MapRenderer','TocRenderer','PresentationView','ExportData','Portable','Architecture'];
for(const name of singleSources)assert.ok(runtimeSource.includes(`const ${name}=`)||runtimeSource.includes(`const ${name} =`),`generated runtime missing ${name}`);

console.log(`Architecture audit: OK (${runtimeModules.length} ESM source modules, ${required.length} integration gates, unified Smart Compose + Demo + Portable shell)`);
