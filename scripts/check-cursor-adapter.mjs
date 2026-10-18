// TDD proof runner for the cursor adapter slice (v0.11 R3c). The merge
// oracle replays recorded runners in a merged tree WITHOUT dist - dist is
// untracked, so a bare `node --test` replay would spawn a missing CLI. Build
// in place, then run the recorded suite (same shape as
// scripts/check-opencode-adapter.mjs).
import { spawnSync } from 'node:child_process';

for (const args of [
  ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json'],
  ['--test', 'test/adapters-cursor.test.js'],
]) {
  const r = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (r.error || r.status !== 0) process.exit(r.status || 1);
}
console.log('CURSOR ADAPTER SUITE PASSED');
