import { spawnSync } from 'node:child_process';

// Oracle worktrees do not contain ignored dist/. Build the exact checkout
// before exercising its CLI, rather than relying on a developer's old build.
for (const args of [
  ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json'],
  ['--test', 'test/windows-path-identity.test.js'],
]) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}
console.log('WINDOWS PATH REGRESSIONS PASSED');
