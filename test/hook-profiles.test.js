// Hook strictness profiles: `aegis hooks --profile minimal|standard|strict`
// switches which git hooks Aegis manages. minimal = post-commit only (advisory
// checkpoint, zero blocking); standard = the three hooks; strict = standard
// but pre-push also runs `aegis validate tests`. Moving to a lighter profile
// removes only Aegis-managed hook files (marker present) - foreign hooks and
// `.aegis-orig` backups are never touched.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { scratch, aegis } from './helpers.js';

const hookPath = (dir, name) => path.join(dir, '.git', 'hooks', name);
const configOf = (dir) =>
  JSON.parse(fs.readFileSync(path.join(dir, '.aegis', 'config.json'), 'utf8'));

// (a) standard init -> --profile minimal: pre-commit + pre-push removed,
//     post-commit kept, config.hooks_profile updated.
test('aegis hooks --profile minimal removes pre-commit + pre-push, keeps post-commit', (t) => {
  const dir = scratch(t); // standard init -> 3 hooks installed
  for (const name of ['pre-commit', 'post-commit', 'pre-push'])
    assert.ok(fs.existsSync(hookPath(dir, name)), `${name} present after standard init`);

  const r = aegis(dir, ['hooks', '--profile', 'minimal']);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(!fs.existsSync(hookPath(dir, 'pre-commit')), 'pre-commit removed');
  assert.ok(!fs.existsSync(hookPath(dir, 'pre-push')), 'pre-push removed');
  assert.ok(fs.existsSync(hookPath(dir, 'post-commit')), 'post-commit kept');
  assert.equal(configOf(dir).hooks_profile, 'minimal');
  assert.match(r.stdout, /installed \[post-commit\]/);
  assert.match(r.stdout, /removed \[pre-commit, pre-push\]/);
});

// (b) --profile strict: pre-push contains BOTH validate contracts and tests.
test('aegis hooks --profile strict: pre-push runs validate tests after contracts', (t) => {
  const dir = scratch(t);
  const r = aegis(dir, ['hooks', '--profile', 'strict']);
  assert.equal(r.status, 0, r.stderr);
  const prePush = fs.readFileSync(hookPath(dir, 'pre-push'), 'utf8');
  assert.match(prePush, /validate contracts/);
  assert.match(prePush, /validate tests/);
  assert.equal(configOf(dir).hooks_profile, 'strict');
  for (const name of ['pre-commit', 'post-commit', 'pre-push'])
    assert.ok(fs.existsSync(hookPath(dir, name)), `${name} present in strict`);
});

// (c) a foreign pre-commit planted before init survives every profile switch
//     as `.aegis-orig` and is never deleted.
test('foreign pre-commit survives every profile switch as .aegis-orig', (t) => {
  const dir = scratch(t, { init: false });
  const hookP = path.join(dir, '.git', 'hooks', 'pre-commit');
  fs.writeFileSync(hookP, '#!/bin/sh\necho foreign-survived >> .foreign-log\n');
  fs.chmodSync(hookP, 0o755);
  const orig = `${hookP}.aegis-orig`;

  aegis(dir, ['init', '--yes']); // standard: foreign moved aside + chained
  assert.ok(fs.existsSync(orig), 'foreign moved to .aegis-orig at init');

  aegis(dir, ['hooks', '--profile', 'minimal']); // drops aegis pre-commit
  assert.ok(fs.existsSync(orig), '.aegis-orig survives minimal');
  assert.ok(!fs.existsSync(hookP), 'aegis pre-commit removed in minimal');

  aegis(dir, ['hooks', '--profile', 'strict']); // reinstalls pre-commit
  assert.ok(fs.existsSync(orig), '.aegis-orig survives strict');
  assert.ok(fs.existsSync(hookP), 'aegis pre-commit reinstalled in strict');

  aegis(dir, ['hooks', '--profile', 'standard']);
  assert.ok(fs.existsSync(orig), '.aegis-orig survives standard');

  // foreign content intact + aegis hook still chains into the orig
  assert.match(fs.readFileSync(orig, 'utf8'), /foreign-survived/);
  assert.match(fs.readFileSync(hookP, 'utf8'), /aegis-orig/);
});

// (d) invalid profile value -> exit 4.
test('aegis hooks --profile bogus -> exit 4', (t) => {
  const dir = scratch(t);
  const r = aegis(dir, ['hooks', '--profile', 'bogus']);
  assert.equal(r.status, 4);
  assert.match(r.stderr, /unknown hooks profile 'bogus'/);
});

test('aegis hooks --profile (no value) -> exit 4', (t) => {
  const dir = scratch(t);
  const r = aegis(dir, ['hooks', '--profile']);
  assert.equal(r.status, 4);
  assert.match(r.stderr, /--profile requires a value/);
});

// no-args path: reinstalls the configured profile (or standard default).
test('aegis hooks (no args) reinstalls the configured profile', (t) => {
  const dir = scratch(t); // hooks_profile standard after init
  // drop to minimal, then no-args must honor the now-minimal config
  aegis(dir, ['hooks', '--profile', 'minimal']);
  assert.ok(!fs.existsSync(hookPath(dir, 'pre-commit')));
  assert.equal(aegis(dir, ['hooks']).status, 0);
  assert.ok(!fs.existsSync(hookPath(dir, 'pre-commit')), 'minimal config -> still no pre-commit');
  // set strict explicitly, then no-args reinstalls strict (pre-push has tests)
  aegis(dir, ['hooks', '--profile', 'strict']);
  assert.equal(aegis(dir, ['hooks']).status, 0);
  assert.match(fs.readFileSync(hookPath(dir, 'pre-push'), 'utf8'), /validate tests/);
});

// init --profile full maps to strict hooks (push also validates tests).
test('init --profile full installs strict hooks (pre-push validates tests)', (t) => {
  const dir = scratch(t, { init: false });
  const r = aegis(dir, ['init', '--yes', '--profile', 'full']);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(configOf(dir).hooks_profile, 'strict');
  assert.match(fs.readFileSync(hookPath(dir, 'pre-push'), 'utf8'), /validate tests/);
});

// init default (standard) records hooks_profile standard.
test('init default records hooks_profile standard', (t) => {
  const dir = scratch(t, { init: false });
  aegis(dir, ['init', '--yes']);
  assert.equal(configOf(dir).hooks_profile, 'standard');
  assert.doesNotMatch(fs.readFileSync(hookPath(dir, 'pre-push'), 'utf8'), /validate tests/);
});
