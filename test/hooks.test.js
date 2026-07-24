// init-installed git hooks: the pre-commit typecheck (now via `aegis typecheck`)
// must not block the greenfield first commit - tsconfig present but zero .ts
// files -> honest UNMEASURED (nothing to check), exit 0.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { scratch, gitIn, aegis } from './helpers.js';

const GIT_IDENTITY = ['-c', 'user.email=aegis-test@example.com', '-c', 'user.name=aegis-test'];

test('pre-commit hook passes on fresh init with no TS files (typecheck UNMEASURED)', (t) => {
  const dir = scratch(t); // git repo + aegis init --yes (hooks installed)
  fs.writeFileSync(path.join(dir, 'tsconfig.json'), '{ "compilerOptions": { "strict": true } }\n');
  fs.writeFileSync(path.join(dir, 'README.md'), '# fresh project\n');
  gitIn(dir, ['add', '-A']);
  const r = spawnSync('git', [...GIT_IDENTITY, 'commit', '-m', 'first commit'],
    { cwd: dir, encoding: 'utf8' });
  assert.equal(r.status, 0, `stdout: ${r.stdout}\nstderr: ${r.stderr}`);
  // tsconfig present but no .ts source -> honest UNMEASURED (never a fake FAIL
  // from tsc's TS18003 "No inputs were found", never a fake PASS).
  assert.match(`${r.stdout}\n${r.stderr}`, /typecheck: UNMEASURED.*no typescript source files/);
});

// Brownfield safety: a repo with pre-existing hooks (husky/lefthook/custom)
// must not have them clobbered by aegis init - they are moved aside and
// chained, so both hooks run.
test('init preserves a pre-existing foreign hook: moved aside and chained', (t) => {
  const dir = scratch(t, { init: false });
  const hookP = path.join(dir, '.git', 'hooks', 'pre-commit');
  fs.writeFileSync(hookP, '#!/bin/sh\necho foreign-hook-ran >> .foreign-hook-log\n');
  fs.chmodSync(hookP, 0o755);
  const r = aegis(dir, ['init', '--yes']);
  assert.equal(r.status, 0, r.stderr);
  // original moved aside, content intact
  const orig = fs.readFileSync(`${hookP}.aegis-orig`, 'utf8');
  assert.match(orig, /foreign-hook-ran/);
  // new hook is ours and chains
  const ours = fs.readFileSync(hookP, 'utf8');
  assert.match(ours, /# AEGIS/);
  assert.match(ours, /aegis-orig/);
  // a commit runs BOTH hooks
  fs.writeFileSync(path.join(dir, 'f.txt'), 'x\n');
  gitIn(dir, ['add', '-A']);
  const c = spawnSync('git', [...GIT_IDENTITY, 'commit', '-m', 'x'], { cwd: dir, encoding: 'utf8' });
  assert.equal(c.status, 0, `stdout: ${c.stdout}\nstderr: ${c.stderr}`);
  assert.match(fs.readFileSync(path.join(dir, '.foreign-hook-log'), 'utf8'), /foreign-hook-ran/);
});

test('a failing pre-existing hook still blocks the commit (chain propagates failure)', (t) => {
  const dir = scratch(t, { init: false });
  const hookP = path.join(dir, '.git', 'hooks', 'pre-commit');
  fs.writeFileSync(hookP, '#!/bin/sh\necho foreign-rejected >&2\nexit 1\n');
  fs.chmodSync(hookP, 0o755);
  aegis(dir, ['init', '--yes']);
  fs.writeFileSync(path.join(dir, 'f.txt'), 'x\n');
  gitIn(dir, ['add', '-A']);
  const c = spawnSync('git', [...GIT_IDENTITY, 'commit', '-m', 'x'], { cwd: dir, encoding: 'utf8' });
  assert.equal(c.status, 1);
  assert.match(`${c.stdout}\n${c.stderr}`, /foreign-rejected/);
});

test('re-init is idempotent: does not nest or re-move the foreign hook', (t) => {
  const dir = scratch(t, { init: false });
  const hookP = path.join(dir, '.git', 'hooks', 'pre-commit');
  fs.writeFileSync(hookP, '#!/bin/sh\ntrue\n');
  fs.chmodSync(hookP, 0o755);
  aegis(dir, ['init', '--yes']);
  aegis(dir, ['init', '--overwrite']);
  const ours = fs.readFileSync(hookP, 'utf8');
  assert.equal((ours.match(/aegis-orig/g) || []).length, 1, 'single chain reference');
  assert.match(fs.readFileSync(`${hookP}.aegis-orig`, 'utf8'), /^#!\/bin\/sh\ntrue/);
  assert.ok(!fs.existsSync(`${hookP}.aegis-orig.aegis-orig`), 'no nesting');
});

test('hook scripts never fall back to npx (aegis is not on the npm registry)', (t) => {
  const dir = scratch(t);
  for (const name of ['pre-commit', 'post-commit', 'pre-push']) {
    const hook = fs.readFileSync(path.join(dir, '.git', 'hooks', name), 'utf8');
    assert.ok(!hook.includes('npx --yes aegis'), `${name} must not npx-fallback`);
    assert.match(hook, /reinstall aegis or re-run: aegis init --overwrite/);
  }
});
