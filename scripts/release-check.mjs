import { spawnSync } from 'node:child_process';

const commands = [
  ['node', ['tests/core.test.mjs']],
  ['node', ['tests/diagnostics.test.mjs']],
  ['node', ['tests/recovery.test.mjs']],
  ['node', ['tests/performance.test.mjs']],
  ['node', ['scripts/verify-index.mjs']],
  ['node', ['scripts/verify-portable-contracts.mjs']],
  ['node', ['scripts/verify-interaction-contracts.mjs']],
  ['node', ['scripts/verify-theme-contracts.mjs']],
  ['node', ['scripts/verify-recovery-contracts.mjs']],
  ['node', ['scripts/verify-rc-contracts.mjs']],
];

for (const [cmd, args] of commands) {
  const result = spawnSync(cmd, args, { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log('MindDeck release check: ALL OK');
