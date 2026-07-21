// init-installed git hooks: the pre-commit typecheck must not block the
// greenfield first commit - tsconfig present but zero .ts files -> skip.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { scratch, gitIn } from './helpers.js';

const GIT_IDENTITY = ['-c', 'user.email=aegis-test@example.com', '-c', 'user.name=aegis-test'];

test('pre-commit hook passes on fresh init with no TS files (typecheck skipped)', (t) => {
  const dir = scratch(t); // git repo + aegis init --yes (hooks installed)
  fs.writeFileSync(path.join(dir, 'tsconfig.json'), '{ "compilerOptions": { "strict": true } }\n');
  fs.writeFileSync(path.join(dir, 'README.md'), '# fresh project\n');
  gitIn(dir, ['add', '-A']);
  const r = spawnSync('git', [...GIT_IDENTITY, 'commit', '-m', 'first commit'],
    { cwd: dir, encoding: 'utf8' });
  assert.equal(r.status, 0, `stdout: ${r.stdout}\nstderr: ${r.stderr}`);
  assert.match(`${r.stdout}\n${r.stderr}`, /no TypeScript files yet - typecheck skipped/);
});
