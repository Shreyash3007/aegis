// doctor drift detector (A1.4): machine state must never enter the git
// index, and .gitignore must cover .aegis/. Regression tests for the
// index-poison trap: untracked .gitignore deleted by a branch switch
// un-ignores the tree, `git add -A` absorbs it, checkout deletes state.json.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { scratch, aegis, gitIn, readState, writeState } from './helpers.js';

test('doctor: clean install reports no machine-state drift', (t) => {
  const dir = scratch(t);
  const r = aegis(dir, ['doctor']);
  assert.equal(r.status, 0, r.stderr);
  assert.doesNotMatch(r.stdout, /machine-state/);
  assert.doesNotMatch(r.stdout, /no \.gitignore/);
});

test('doctor: tracked .aegis files are reported as drift', (t) => {
  const dir = scratch(t);
  gitIn(dir, ['add', '-f', '.aegis/state.json']);
  const r = aegis(dir, ['doctor']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /machine-state file\(s\) tracked by git/);
  assert.match(r.stdout, /git rm -r --cached \.aegis/);
});

test('doctor: .gitignore without .aegis/ is reported as drift', (t) => {
  const dir = scratch(t);
  fs.writeFileSync(path.join(dir, '.gitignore'), 'node_modules/\n');
  const r = aegis(dir, ['doctor']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /\.gitignore does not cover \.aegis\//);
});

test('doctor: routed blades missing from the store are drift', (t) => {
  const dir = scratch(t);
  // Point the store lookup at an empty dir: every routed blade is "missing".
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-empty-store-'));
  t.after(() => fs.rmSync(empty, { recursive: true, force: true }));
  const r = aegis(dir, ['doctor'], { env: { AEGIS_SKILL_STORES: empty } });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /routed blade\(s\) missing from the skill store/);
  assert.match(r.stdout, /jev-use/); // a known blade is named
});

test('doctor: cycle guard approaching is attention (reset at cycle start)', (t) => {
  const dir = scratch(t);
  const s = readState(dir);
  s.state_visits = { '07a': 2 }; // max_loop is 3: one more entry parks
  writeState(dir, s);
  const r = aegis(dir, ['doctor']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /state 07a visited 2\/3/);
  assert.match(r.stdout, /aegis loops reset --reason/);
});

test('doctor: stale hook bake is drift; fresh bake is silent', (t) => {
  const dir = scratch(t);
  const clean = aegis(dir, ['doctor']);
  assert.doesNotMatch(clean.stdout, /hooks were baked for/);
  const hookP = path.join(dir, '.git', 'hooks', 'pre-commit');
  fs.writeFileSync(hookP, fs.readFileSync(hookP, 'utf8').replace(/!= "v?[\d.]+"/, '!= "0.0.1"'));
  const stale = aegis(dir, ['doctor']);
  assert.equal(stale.status, 0, stale.stderr);
  assert.match(stale.stdout, /hooks were baked for v0\.0\.1/);
  assert.match(stale.stdout, /re-run: aegis hooks/);
});
