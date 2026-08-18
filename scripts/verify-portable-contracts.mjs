import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

const contracts = [
  ['portable runtime template marker', 'Portable Runtime ${RUNTIME_VERSION}'],
  ['runtime version constant', 'RUNTIME_VERSION="9.5"'],
  ['map reflow', 'id="reflowBtn"'],
  ['expand all', 'id="expandBtn"'],
  ['collapse all', 'id="collapseBtn"'],
  ['layout selector', 'id="layoutSel"'],
  ['TOC toggle', 'id="tocToggle"'],
  ['TOC node folding', 'class="foldBtn '],
  ['presentation sequence rebuild', 'function rebuildPresentation'],
  ['fixed 16:9 stage width', 'const W=1600,H=900'],
  ['responsive stage fit', 'Math.min(aw/W,ah/H)'],
  ['mobile TOC drawer', '@media(max-width:700px)'],
  ['mindmap builder', 'function buildStandaloneMindmapHtml()'],
  ['presentation builder', 'function buildStandaloneViewerHtml()'],
  ['fusion builder', 'function buildStandaloneFusionHtml()'],
];

for (const [name, marker] of contracts) {
  if (!html.includes(marker)) throw new Error(`Portable contract missing: ${name} (${marker})`);
}

const main = html.match(/<script>([\s\S]*?)<\/script>/);
if (!main) throw new Error('Main inline script not found');
new vm.Script(main[1], { filename: 'index-inline.js' });

console.log(`Portable export contracts: OK (${contracts.length} checks)`);
