import { spawnSync } from 'node:child_process';

for (const args of [
  ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json'],
  ['--test', 'test/windows-lock-leaf.test.js'],
]) {
  const r = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (r.error || r.status !== 0) process.exit(r.status || 1);
}
console.log('LOCK LEAF REGRESSIONS PASSED');
