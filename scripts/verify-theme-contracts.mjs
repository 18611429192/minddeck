import fs from 'node:fs';
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const markers = [
  'id="appearanceBtn"', 'id="themePanel"', 'data-theme-choice="light"', 'data-theme-choice="dark"',
  'data-theme-choice="business"', 'data-theme-choice="minimal"', 'function applyUiTheme()',
  'id="themeSel"', 'data.uiTheme', 'data-ui-theme="${portableTheme}"',
];
for (const marker of markers) if (!html.includes(marker)) throw new Error(`Theme contract missing: ${marker}`);
console.log(`Theme contracts: OK (${markers.length} checks)`);
