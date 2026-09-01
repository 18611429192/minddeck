import fs from 'node:fs';
import assert from 'node:assert/strict';

const ui=fs.readFileSync(new URL('../src/app/modules/29-ai-assistant.js',import.meta.url),'utf8');
const composeCompat=fs.readFileSync(new URL('../src/app/modules/29-ai-entry-compat.js',import.meta.url),'utf8');
const manifest=JSON.parse(fs.readFileSync(new URL('../src/app/app.manifest.json',import.meta.url),'utf8'));
const runtime=fs.readFileSync(new URL('../src/runtime/index.js',import.meta.url),'utf8');
const build=fs.readFileSync(new URL('../scripts/build-runtime.mjs',import.meta.url),'utf8');

assert.ok(manifest.scripts.includes('modules/29-ai-assistant.js'),'AI assistant must be included in application closure');
assert.ok(manifest.scripts.includes('modules/29-ai-entry-compat.js'),'Unified compose compatibility layer must be included in application closure');
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

assert.ok(composeCompat.includes("smartComposeButton.textContent='智能组稿'"),'Top toolbar must expose a single Smart Compose entry');
assert.ok(composeCompat.includes("document.getElementById('aiV10ComposeBtn')?.remove()"),'Legacy separate AI compose entry must be removed');
assert.ok(composeCompat.includes("document.getElementById('v99DeckSpecBtn')?.remove()"),'Legacy separate DeckSpec entry must be removed');
assert.ok(composeCompat.includes("['ai','AI 智能规划'")&&composeCompat.includes("['local','本地快速组稿'")&&composeCompat.includes("['deckspec','DeckSpec 高级输入'"),'Unified compose dialog must expose AI, local and DeckSpec modes');
assert.ok(composeCompat.includes('function openUnifiedComposeV10(){openAISmartComposerV10()}'),'Unified compose must default to AI planning');
assert.ok(composeCompat.includes('openDeckSpecImporterOriginalV10'),'DeckSpec compiler path must remain available behind the unified entry');
assert.ok(composeCompat.includes('openSmartComposerOriginalV10'),'Local Composer path must remain available behind the unified entry');

console.log('DeepSeek AI UI contract: OK');
