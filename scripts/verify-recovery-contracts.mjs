import fs from 'node:fs';
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const markers = [
  'const STORAGE_KEY="minddeck-v9-data"', 'BACKUP_KEY="minddeck-v9-backup"',
  'function persistProjectNow(', 'function saveNow(', 'function createRecoveryBackup(',
  'function restoreRecoveryBackup()', 'id="restoreBackupBtn"', 'id="saveStatus"',
  'window.addEventListener("beforeunload"', 'createRecoveryBackup("before-import")',
];
for (const marker of markers) if (!html.includes(marker)) throw new Error(`Recovery contract missing: ${marker}`);
console.log(`Recovery contracts: OK (${markers.length} checks)`);
