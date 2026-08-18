import fs from 'node:fs';
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const markers = [
  'MindDeck V9.5 RC', 'id="welcomeOverlay"', 'id="helpBtn"', 'data-mm="help"',
  'function showWelcome(force=false)', 'function closeWelcome()', 'minddeck-v9-onboarded',
  'RELEASE_CHANNEL="rc"', 'releaseChannel:RELEASE_CHANNEL', 'RUNTIME_VERSION="9.5"', 'Portable Runtime ${RUNTIME_VERSION}',
];
for (const marker of markers) if (!html.includes(marker)) throw new Error(`RC contract missing: ${marker}`);
const blockers = ['TODO_RELEASE_BLOCKER', 'FIXME_RELEASE_BLOCKER'];
for (const marker of blockers) if (html.includes(marker)) throw new Error(`Release blocker marker present: ${marker}`);
console.log(`RC contracts: OK (${markers.length} checks)`);
