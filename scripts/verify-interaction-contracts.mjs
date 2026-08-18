import fs from 'node:fs';
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const markers = [
  'const APP_COMMANDS={',
  'function runAppCommand(name)',
  'mobileMainFit',
  'mobileMainAdd',
  'mobileMainPage',
  'mobileMainPresent',
  'runAppCommand("reflow")',
  'runAppCommand("exportCurrent")',
  'runAppCommand("health")',
  'runAppCommand("present")',
];
for (const marker of markers) if (!html.includes(marker)) throw new Error(`Interaction contract missing: ${marker}`);
if (html.includes('data-mm="page">编辑当前页面')) throw new Error('Duplicate mobile current-page entry reintroduced');
console.log(`Interaction contracts: OK (${markers.length} checks)`);
