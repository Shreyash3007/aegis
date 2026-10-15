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
  'gates', 'contracts', 'config', 'status-markdown',
].map(name => `test/${name}.test.js`));
console.log(`Scratch and captured output: ${temp}`);
for (const [name, args] of [
  ['build', ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json']],
  ['tests', ['--test', '--test-concurrency=1', ...files]],
]) {
  const log = path.join(temp, `${name}.log`), fd = fs.openSync(log, 'w');
  let r;
  try { r = spawnSync(process.execPath, args, { env, stdio: ['ignore', fd, fd], timeout: 600_000 }); }
  finally { fs.closeSync(fd); }
  if (r.error) fs.appendFileSync(log, String(r.error));
  process.stdout.write(fs.readFileSync(log, 'utf8'));
  if (r.error || r.status !== 0) process.exit(r.status || 1);
}
