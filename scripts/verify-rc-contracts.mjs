import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const versionMatch = pkg.version.match(/^(\d+)\.(\d+)\.(\d+)-rc(?:\.(\d+))?$/);
if (!versionMatch) {
  throw new Error(`package.json version is not an RC version: ${pkg.version}`);
}

const [, major, minor, patch] = versionMatch;
const displayVersion = `MindDeck V${major}.${minor}.${patch} RC`;

if (!html.includes(displayVersion)) {
  throw new Error(
    `RC version mismatch: package.json=${pkg.version}; ` +
    `expected index.html to contain "${displayVersion}"`
  );
}

const markers = [
  'id="welcomeOverlay"',
  'id="helpBtn"',
  'data-mm="help"',
  'function showWelcome(force=false)',
  'function closeWelcome()',
  'minddeck-v9-onboarded',
  'RELEASE_CHANNEL="rc"',
  'releaseChannel:RELEASE_CHANNEL',
  'RUNTIME_VERSION=',
  'Portable Runtime ${RUNTIME_VERSION}',
];

for (const marker of markers) {
  if (!html.includes(marker)) throw new Error(`RC contract missing: ${marker}`);
}

const blockers = ['TODO_RELEASE_BLOCKER', 'FIXME_RELEASE_BLOCKER'];
for (const marker of blockers) {
  if (html.includes(marker)) throw new Error(`Release blocker marker present: ${marker}`);
}

console.log(`RC contracts: OK (${markers.length + 1} checks, ${displayVersion})`);
