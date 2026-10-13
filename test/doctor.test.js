// doctor drift detector (A1.4): machine state must never enter the git
// index, and .gitignore must cover .aegis/. Regression tests for the
// index-poison trap: untracked .gitignore deleted by a branch switch
// un-ignores the tree, `git add -A` absorbs it, checkout deletes state.json.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { scratch, aegis, gitIn } from './helpers.js';

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
