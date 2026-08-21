import fs from 'node:fs';
import assert from 'node:assert/strict';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
for(const marker of ['const STORAGE_KEY="minddeck-v9-data"','BACKUP_KEY="minddeck-v9-backup"','function persistProjectNow(','function saveNow(','function createRecoveryBackup(','function restoreRecoveryBackup()','id="restoreBackupBtn"','id="saveStatus"','window.addEventListener("beforeunload"','RecoveryCore.createEnvelope(','RecoveryCore.historyLimitForBytes(']) assert.ok(html.includes(marker),`Recovery contract missing: ${marker}`);
console.log('Recovery contracts: OK (11 checks)');
