import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('../src/runtime/shared-core.js', import.meta.url), 'utf8').trimEnd();
const styles = fs.readFileSync(new URL('../src/runtime/shared-styles.css', import.meta.url), 'utf8').trimEnd();

const runtimeMatch = html.match(/<!-- MINDDECK_SHARED_RUNTIME_START -->\s*<script id="minddeck-shared-runtime">\s*([\s\S]*?)\s*<\/script>\s*<!-- MINDDECK_SHARED_RUNTIME_END -->/);
const stylesMatch = html.match(/<!-- MINDDECK_SHARED_STYLES_START -->\s*<style id="minddeck-shared-styles">\s*([\s\S]*?)\s*<\/style>\s*<!-- MINDDECK_SHARED_STYLES_END -->/);
assert.ok(runtimeMatch, 'embedded shared runtime missing');
assert.ok(stylesMatch, 'embedded shared styles missing');
assert.equal(runtimeMatch[1].trimEnd(), runtime, 'index embedded runtime drifted from src/runtime/shared-core.js');
assert.equal(stylesMatch[1].trimEnd(), styles, 'index embedded styles drifted from src/runtime/shared-styles.css');

const mainScripts = [...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]);
assert.ok(mainScripts.length >= 2, 'expected shared runtime + app script');
const app = mainScripts.at(-1);

const required = [
  ['main map uses shared renderer', 'MapRendererCore.render(data,{'],
  ['main map editing uses shared inline editor', 'InlineEditorCore.start({'],
  ['main map commands use shared dispatcher', 'CommandsCore.applyMapAction(data,selectedNodeId,action'],
  ['main presentation uses shared view', 'PresentationViewCore.create({'],
  ['main presentation delegates TOC to shared view', 'function renderToc(){return presentationView?.renderToc()}'],
  ['main presentation delegates slide render to shared view', 'function renderPresentSlide(){return presentationView?.render()}'],
  ['main diagnostics use shared core', 'DiagnosticsCore.inspect(data,{'],
  ['main recovery uses shared core', 'RecoveryCore.historyLimitForBytes('],
  ['portable export data uses shared core', 'ExportDataCore.project(data,kind)'],
  ['node defaults use shared slide model', 'SlideCore.defaultElementsForNode(n,{uid:()=>IdsCore.create("e_",8)})'],
  ['layer ranges use shared constants', 'const {MASTER_Z_MIN,MASTER_Z_MAX,SLIDE_Z_MIN,SLIDE_Z_MAX}=Core.RANGES;'],
  ['portable shell mounts shared runtime', 'globalThis.MindDeckCore.Portable.mount({data,kind:KIND'],
];
for (const [name, marker] of required) assert.ok(app.includes(marker), `${name} missing`);
assert.ok(runtime.includes('const presentationView=PresentationView.create({'), 'portable presentation does not use shared PresentationView');

const forbiddenAppBusiness = [
  /function\s+subtreeWeight\s*\(/,
  /function\s+layoutHorizontalBranches\s*\(/,
  /function\s+layoutDownBranches\s*\(/,
  /function\s+layoutRadialBranches\s*\(/,
  /function\s+presentationOrder\s*\(/,
  /function\s+resolvePresentationIndex\s*\(/,
  /function\s+renderPresentElement\s*\(/,
  /let\s+presentationWheelLocked\b/ ,
  /let\s+presentTouchStart\b/ ,
  /function\s+baseText\s*\(/,
  /function\s+baseShape\s*\(/,
  /function\s+extractMindmapData\s*\(/,
];
for (const re of forbiddenAppBusiness) assert.ok(!re.test(app), `duplicate app business implementation reintroduced: ${re}`);

const portableTemplate = app.match(/\$\{sharedRuntimeSource\}([\s\S]*?)__SCRIPT_END__/);
assert.ok(portableTemplate, 'portable template runtime section missing');
const portableBody = portableTemplate[1];
assert.ok(portableBody.includes('MindDeckCore.Portable.mount'), 'portable does not delegate to shared Portable runtime');
for (const re of [
  /function\s+renderMap\s*\(/,
  /function\s+renderToc\s*\(/,
  /function\s+autoLayout\s*\(/,
  /function\s+rebuildPresentation\s*\(/,
  /function\s+inlineEdit\s*\(/,
  /function\s+fitStage\s*\(/,
  /function\s+edge\s*\(/,
  /\bhLayout\b/, /\bdLayout\b/, /\brKids\b/, /\bpOrder\b/,
]) assert.ok(!re.test(portableBody), `portable duplicated implementation reintroduced: ${re}`);

const adapters = [
  'src/core/ids.js','src/core/tree.js','src/core/layout.js','src/core/presentation.js','src/core/project.js',
  'src/core/commands.js','src/core/recovery.js','src/core/diagnostics.js'
];
for (const path of adapters) {
  const code = fs.readFileSync(new URL('../'+path, import.meta.url), 'utf8');
  assert.ok(code.includes("from './runtime.js'") || code.includes("from './runtime.js';"), `${path} is not a shared-core adapter`);
  assert.ok(!/\bfunction\s+[A-Za-z_$]/.test(code), `${path} contains a second function implementation`);
}

const singleSources = [
  'Ids','Tree','Project','Layout','Commands','Presentation','PresentationSession','Stage','MapViewport',
  'Animation','Element','Slide','Fullscreen','Input','Recovery','Diagnostics','InlineEditor',
  'MapRenderer','TocRenderer','PresentationView','ExportData','Portable','Architecture'
];
for (const name of singleSources) assert.ok(runtime.includes(`const ${name}=`) || runtime.includes(`const ${name} =`), `shared source missing ${name}`);

console.log(`Architecture audit: OK (${required.length} integration gates, no duplicate business runtime)`);
