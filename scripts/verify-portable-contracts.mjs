import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const contracts = [
  ['portable runtime marker', 'Portable Runtime ${RUNTIME_VERSION}'],
  ['shared runtime embed', '${sharedRuntimeSource}'],
  ['shared styles embed', '${sharedStylesSource}'],
  ['single portable mount', 'MindDeckCore.Portable.mount({data,kind:KIND'],
  ['map reflow control', 'id="reflowBtn"'],
  ['expand all control', 'id="expandBtn"'],
  ['collapse all control', 'id="collapseBtn"'],
  ['layout selector', 'id="layoutSel"'],
  ['theme selector', 'id="themeSel"'],
  ['TOC toggle', 'id="tocToggle"'],
  ['fullscreen control', 'id="fullBtn"'],
  ['mindmap builder', 'function buildStandaloneMindmapHtml()'],
  ['presentation builder', 'function buildStandaloneViewerHtml()'],
  ['fusion builder', 'function buildStandaloneFusionHtml()'],
  ['export data core', 'function buildPortableData(kind){return ExportDataCore.project(data,kind)}'],
];
for (const [name, marker] of contracts) assert.ok(html.includes(marker), `Portable contract missing: ${name}`);
console.log(`Portable export contracts: OK (${contracts.length} checks)`);
