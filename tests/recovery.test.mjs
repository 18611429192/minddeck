import assert from 'node:assert/strict';
import { createRecoveryEnvelope, parseRecoveryEnvelope, historyLimitForBytes, estimateUtf8Bytes } from '../src/core/recovery.js';

const project = { id: 'root', title: 'demo', children: [] };
const env = createRecoveryEnvelope(project, 'before-import', new Date('2026-08-18T00:00:00Z'));
assert.equal(env.reason, 'before-import');
assert.equal(env.savedAt, '2026-08-18T00:00:00.000Z');
assert.notEqual(env.project, project);
assert.deepEqual(parseRecoveryEnvelope(JSON.stringify(env)).project, project);
assert.equal(parseRecoveryEnvelope('{broken'), null);
assert.equal(historyLimitForBytes(1000), 80);
assert.equal(historyLimitForBytes(3 * 1024 * 1024), 20);
assert.equal(historyLimitForBytes(10 * 1024 * 1024), 6);
assert.ok(estimateUtf8Bytes('思维导图') > 4);
console.log('MindDeck recovery tests: OK');
