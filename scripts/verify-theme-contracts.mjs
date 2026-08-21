import fs from 'node:fs';
import assert from 'node:assert/strict';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
for(const marker of ['id="appearanceBtn"','id="themePanel"','data-theme-choice="light"','data-theme-choice="dark"','data-theme-choice="business"','data-theme-choice="minimal"','function applyUiTheme()','id="themeSel"','ThemeCore.apply(document.body','Theme.apply(doc.body']) assert.ok(html.includes(marker),`Theme contract missing: ${marker}`);
console.log('Theme contracts: OK (10 checks)');
