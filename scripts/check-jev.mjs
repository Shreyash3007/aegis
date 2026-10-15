import { spawnSync } from 'node:child_process';

// Build this checkout before testing; never verify a stale dist/ snapshot.
for (const args of [
  ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json'],
  ['--test', 'test/jev.test.js'],
]) {
  const r = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (r.error || r.status !== 0) process.exit(r.status || 1);
}
