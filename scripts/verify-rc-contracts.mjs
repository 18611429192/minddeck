import fs from 'node:fs';
import assert from 'node:assert/strict';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const m=pkg.version.match(/^(\d+)\.(\d+)\.(\d+)-rc(?:\.(\d+))?$/);assert.ok(m,'package is not RC');
const display=`MindDeck V${m[1]}.${m[2]}.${m[3]} RC`;assert.ok(html.includes(display),`RC version mismatch: ${display}`);
for(const marker of ['id="welcomeOverlay"','id="helpBtn"','data-mm="help"','function showWelcome(force=false)','function closeWelcome()','minddeck-v9-onboarded','RELEASE_CHANNEL="rc"','Portable Runtime ${RUNTIME_VERSION}','id="masterSettingsBtn"','function showMasterSettingsPanel()','PresentationViewCore.create({','MapRendererCore.render(','function renderToc(){return presentationView?.renderToc()}','DiagnosticsCore.inspect(','MindDeckCore.Portable.mount']) assert.ok(html.includes(marker),`RC contract missing: ${marker}`);
for(const blocker of ['TODO_RELEASE_BLOCKER','FIXME_RELEASE_BLOCKER']) assert.ok(!html.includes(blocker),`release blocker present: ${blocker}`);
console.log(`RC contracts: OK (16 checks, ${display})`);
