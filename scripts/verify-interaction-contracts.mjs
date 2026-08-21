import fs from 'node:fs';
import assert from 'node:assert/strict';
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('../src/runtime/shared-core.js', import.meta.url), 'utf8');
for (const marker of [
  'const APP_COMMANDS={','function runAppCommand(name)','mobileMainFit','mobileMainAdd',
  'mobileMainPage','mobileMainPresent','runAppCommand("reflow")','runAppCommand("exportCurrent")',
  'runAppCommand("health")','runAppCommand("present")','presentationView?.handleKey(e)',
  'InputCore.mapKeyAction(e)','CommandsCore.applyMapAction(data,selectedNodeId,action'
]) assert.ok(html.includes(marker), `Interaction contract missing: ${marker}`);
assert.ok(!html.includes('data-mm="page">编辑当前页面'), 'duplicate mobile page command returned');
console.log('Interaction contracts: OK (13 checks)');

if(!runtime.includes('PresentationView.defaults')) throw new Error('Shared PresentationView defaults missing');
