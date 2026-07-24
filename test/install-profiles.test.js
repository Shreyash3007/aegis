// Install profiles (--profile minimal|standard|full): minimal gives the
// standalone tools (ast, validate, checkpoint, resume, doctor, exec, fix,
// chore, update, eval) WITHOUT git hooks or brain/; standard is the full
// pipeline (current behavior); full is reserved (currently == standard).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { scratch, aegis } from './helpers.js';

const hookPath = (dir, name) => path.join(dir, '.git', 'hooks', name);
const brainDir = (dir) => path.join(dir, 'brain');
const configOf = (dir) =>
  JSON.parse(fs.readFileSync(path.join(dir, '.aegis', 'config.json'), 'utf8'));

// ---------- minimal ----------

test('init --profile minimal: no git hooks, no brain/, but standalone tools work', (t) => {
  const dir = scratch(t, { init: false });
  const r = aegis(dir, ['init', '--yes', '--profile', 'minimal']);
  assert.equal(r.status, 0, r.stderr);
  // the note is printed
  assert.match(r.stdout, /minimal profile - standalone tools only; no hooks, no brain/);
  // recorded in config
  assert.equal(configOf(dir).profile, 'minimal');
  // NO git hooks installed (pre-commit / post-commit / pre-push absent)
  for (const name of ['pre-commit', 'post-commit', 'pre-push'])
    assert.ok(!fs.existsSync(hookPath(dir, name)), `${name} hook must NOT be installed in minimal`);
  // NO brain/ dir at all (dirs + context-window.md + module-map.md + templates)
  assert.ok(!fs.existsSync(brainDir(dir)), 'brain/ must NOT exist in minimal');
  // standalone commands still work: state + transitions + skills are present
  assert.ok(fs.existsSync(path.join(dir, '.aegis', 'state.json')));
  assert.ok(fs.existsSync(path.join(dir, '.aegis', 'transitions.json')));
  assert.ok(fs.existsSync(path.join(dir, '.aegis', 'skills')));
  assert.equal(aegis(dir, ['checkpoint']).status, 0, 'checkpoint must work');
  assert.equal(aegis(dir, ['ast', 'build']).status, 0, 'ast build must work');
  assert.equal(aegis(dir, ['validate', 'tests']).status, 0, 'validate tests must work');
});

test('minimal profile: resume + doctor also work (state integrity is intact)', (t) => {
  const dir = scratch(t, { init: false });
  aegis(dir, ['init', '--yes', '--profile', 'minimal']);
  // resume needs a checkpoint to reconstruct from (persist.ts dies(2) otherwise)
  assert.equal(aegis(dir, ['checkpoint']).status, 0);
  assert.equal(aegis(dir, ['resume']).status, 0, 'resume must work');
  assert.equal(aegis(dir, ['doctor']).status, 0, 'doctor must work');
});

// ---------- standard ----------

test('init --profile standard: git hooks AND brain/ are installed', (t) => {
  const dir = scratch(t, { init: false });
  const r = aegis(dir, ['init', '--yes', '--profile', 'standard']);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(configOf(dir).profile, 'standard');
  for (const name of ['pre-commit', 'post-commit', 'pre-push'])
    assert.ok(fs.existsSync(hookPath(dir, name)), `${name} hook must exist in standard`);
  assert.ok(fs.existsSync(brainDir(dir)), 'brain/ must exist in standard');
  assert.ok(fs.existsSync(path.join(brainDir(dir), 'context-window.md')));
});

test('default (no --profile) is standard: hooks + brain/ present, config.profile == standard', (t) => {
  const dir = scratch(t, { init: false });
  const r = aegis(dir, ['init', '--yes']);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(configOf(dir).profile, 'standard');
  assert.ok(fs.existsSync(hookPath(dir, 'pre-commit')));
  assert.ok(fs.existsSync(brainDir(dir)));
});

test('init --profile full: reserved but currently behaves like standard (hooks + brain/)', (t) => {
  const dir = scratch(t, { init: false });
  const r = aegis(dir, ['init', '--yes', '--profile', 'full']);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(configOf(dir).profile, 'full');
  assert.ok(fs.existsSync(hookPath(dir, 'pre-commit')));
  assert.ok(fs.existsSync(brainDir(dir)));
});

// ---------- unknown ----------

test('init --profile bogus -> exit 2 with usage', (t) => {
  const dir = scratch(t, { init: false });
  const r = aegis(dir, ['init', '--yes', '--profile', 'bogus']);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /unknown --profile 'bogus'/);
  assert.match(r.stderr, /minimal\|standard\|full/);
});

test('init --profile (no value) -> exit 2 with usage', (t) => {
  const dir = scratch(t, { init: false });
  const r = aegis(dir, ['init', '--yes', '--profile']);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /--profile requires a value/);
});

// ---------- combination with other flags ----------

test('init --profile minimal --apps web,api: standalone profile + monorepo both apply', (t) => {
  const dir = scratch(t, { init: false });
  const r = aegis(dir, ['init', '--yes', '--profile', 'minimal', '--apps', 'web,api']);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(configOf(dir).profile, 'minimal');
  assert.deepEqual(configOf(dir).apps, ['web', 'api']);
  // minimal still wins: no hooks, no brain
  assert.ok(!fs.existsSync(hookPath(dir, 'pre-commit')));
  assert.ok(!fs.existsSync(brainDir(dir)));
  // per-app states created
  assert.ok(fs.existsSync(path.join(dir, '.aegis', 'apps', 'web', 'state.json')));
  assert.ok(fs.existsSync(path.join(dir, '.aegis', 'apps', 'api', 'state.json')));
});

test('re-init: --overwrite --profile minimal updates config.profile and keeps standalone tools working', (t) => {
  const dir = scratch(t, { init: false });
  aegis(dir, ['init', '--yes', '--profile', 'standard']);
  // minimal re-init wipes .aegis/ and writes the minimal config. Note: re-init
  // only clears .aegis/ (never repo-root brain/), so a prior standard brain/
  // stays on disk - hooks/brain are only ever INSTALLED, never actively removed
  // (matches uninstall semantics). What changes is the profile + new state.
  const r = aegis(dir, ['init', '--overwrite', '--yes', '--profile', 'minimal']);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(configOf(dir).profile, 'minimal');
  assert.match(r.stdout, /minimal profile - standalone tools only; no hooks, no brain/);
  // standalone tools still work after the re-init
  assert.equal(aegis(dir, ['checkpoint']).status, 0);
  assert.equal(aegis(dir, ['ast', 'build']).status, 0);
});
