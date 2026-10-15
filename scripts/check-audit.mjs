import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const tests = fs.readdirSync('test').filter((f) =>
  (f.startsWith('audit-') || ['http-bounds.test.js', 'exec-safety.test.js'].includes(f)) && f.endsWith('.test.js'));
if (!tests.length) throw new Error('audit regressions missing');
for (const args of [
  ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json'],
  ['--test', ...tests.map((f) => `test/${f}`)],
]) {
  const r = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (r.error || r.status !== 0) process.exit(r.status || 1);
}
console.log('AUDIT REGRESSIONS PASSED');
