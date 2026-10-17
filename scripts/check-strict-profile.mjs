// TDD proof runner for the strict-profile slice (v0.11 R1). The merge oracle
// replays recorded runners in a merged tree WITHOUT dist - dist is untracked,
// so a bare `node --test` replay would spawn a missing CLI. Build in place,
// then run the recorded suite (same shape as scripts/check-postrelease-audit.mjs).
import { spawnSync } from 'node:child_process';

for (const args of [
  ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json'],
  ['--test', 'test/strict-profile.test.js'],
]) {
  const r = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (r.error || r.status !== 0) process.exit(r.status || 1);
}
console.log('STRICT PROFILE SUITE PASSED');
