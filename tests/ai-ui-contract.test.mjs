import fs from 'node:fs';
import assert from 'node:assert/strict';

const ui=fs.readFileSync(new URL('../src/app/modules/29-ai-assistant.js',import.meta.url),'utf8');
const manifest=JSON.parse(fs.readFileSync(new URL('../src/app/app.manifest.json',import.meta.url),'utf8'));
const runtime=fs.readFileSync(new URL('../src/runtime/index.js',import.meta.url),'utf8');
const build=fs.readFileSync(new URL('../scripts/build-runtime.mjs',import.meta.url),'utf8');

assert.ok(manifest.scripts.includes('modules/29-ai-assistant.js'),'AI assistant must be included in application closure');
assert.ok(runtime.includes('AICommand')&&runtime.includes('DeepSeek'),'AI runtime APIs must be exported');
assert.ok(build.includes('src/runtime/modules/ai-provider.js'),'Shared runtime build must include the AI provider layer');
assert.ok(ui.includes('sessionStorage'),'DeepSeek key must use sessionStorage');
assert.ok(!/localStorage\.(?:setItem|getItem)\([^\n]*AI_KEY_SESSION/.test(ui),'DeepSeek key must never use localStorage');
assert.ok(!/sk-[A-Za-z0-9]{16,}/.test(ui),'No API key may be embedded in the UI source');
assert.ok(ui.includes('Core.AIStoryPlanner.plan'),'AI compose must use the validated Story Planner');
assert.ok(ui.includes('Core.Planner.toDeckSpec'),'AI compose must pass through DeckSpec');
assert.ok(ui.includes('ComposerV99.compileDeck'),'AI compose must use the shared Composer');
assert.ok(ui.includes('Core.AICommand.plan'),'AI editing must use safe AI patches');
assert.ok(ui.includes('Core.NativeChart.normalize')&&ui.includes('Core.NativeTable.normalize')&&ui.includes('Core.NativeDiagram.normalize'),'AI structured edits must target native editable elements');
assert.ok(ui.includes('checkpoint()'),'AI edits must participate in undo history');
console.log('DeepSeek AI UI contract: OK');
