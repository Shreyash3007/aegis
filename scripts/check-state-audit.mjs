import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const tempBase = process.env.AEGIS_AUDIT_TEMP || (process.platform === 'win32'
  ? path.join(os.homedir(), 'AppData', 'Local', 'Temp', 'opencode') : os.tmpdir());
const temp = fs.mkdtempSync(path.join(tempBase, 'aegis-state-audit-'));
const env = { ...process.env, TMP: temp, TEMP: temp, TMPDIR: temp };
const files = ['test/audit-state-fs.test.js'];
if (!process.argv.includes('--new-only')) files.push(...[
  'transitions', 'checkpoint', 'memory', 'lanes', 'remove', 'concurrency',
  'monorepo', 'fastlane', 'status-machinery', 'autonomy',
].map(name => `test/${name}.test.js`));
console.log(`Scratch and captured output: ${temp}`);
for (const [name, args] of [
  ['build', ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json']],
  ['tests', ['--test', '--test-concurrency=1', ...files]],
]) {
  const r = spawnSync(process.execPath, args, { encoding: 'utf8', env, maxBuffer: 16 * 1024 * 1024 });
  fs.writeFileSync(path.join(temp, `${name}.log`), (r.stdout || '') + (r.stderr || '') + (r.error ? String(r.error) : ''));
  process.stdout.write(r.stdout || ''); process.stderr.write(r.stderr || '');
  if (r.error || r.status !== 0) process.exit(r.status || 1);
}
