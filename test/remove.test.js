// aegis remove: uninstall restores what init took, refuses stranded lanes,
// never touches foreign hooks or brain/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { scratch, aegis } from './helpers.js';

test('remove: drops .aegis, hooks, ignore line; keeps brain; second run exits 2', (t) => {
  const dir = scratch(t);
  const r = aegis(dir, ['remove']);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(!fs.existsSync(path.join(dir, '.aegis')), '.aegis/ gone');
  assert.ok(!fs.existsSync(path.join(dir, '.gitignore')), 'init-created .gitignore removed with its only line');
  assert.ok(fs.existsSync(path.join(dir, 'brain')), 'brain/ kept (user context)');
  const hooks = fs.readdirSync(path.join(dir, '.git', 'hooks'))
    .filter((f) => !f.endsWith('.sample') && !f.endsWith('.aegis-orig'));
  const managed = hooks.filter((f) => {
    const p = path.join(dir, '.git', 'hooks', f);
    return fs.statSync(p).isFile() && fs.readFileSync(p, 'utf8').includes('# AEGIS');
  });
  assert.equal(managed.length, 0, `no managed hooks remain: ${managed}`);
  assert.match(r.stdout, /brain\//);
  assert.equal(aegis(dir, ['remove']).status, 2, 'second remove: nothing to remove');
  assert.equal(aegis(dir, ['remove', 'x']).status, 2, 'remove takes no arguments');
});

test('remove: foreign hook moved aside at install is restored byte-identical', (t) => {
  const dir = scratch(t, { init: false });
  const hookP = path.join(dir, '.git', 'hooks', 'pre-commit');
  fs.writeFileSync(hookP, '#!/bin/sh\necho foreign\n');
  assert.equal(aegis(dir, ['init', '--yes']).status, 0);
  assert.ok(fs.existsSync(`${hookP}.aegis-orig`), 'backup taken at install');
  assert.equal(aegis(dir, ['remove']).status, 0);
  assert.equal(fs.readFileSync(hookP, 'utf8'), '#!/bin/sh\necho foreign\n', 'foreign hook restored');
  assert.ok(!fs.existsSync(`${hookP}.aegis-orig`), 'backup consumed, not littered');
});

test('remove: refuses with open slices (no stranded worktrees)', (t) => {
  const dir = scratch(t);
  assert.equal(aegis(dir, ['slice', 'create', 'stuck']).status, 0);
  const r = aegis(dir, ['remove']);
  assert.equal(r.status, 4, r.stderr);
  assert.match(r.stderr, /open slices\/lanes: stuck/);
  assert.ok(fs.existsSync(path.join(dir, '.aegis', 'state.json')), 'state intact after refusal');
  assert.equal(aegis(dir, ['slice', 'remove', 'stuck']).status, 0);
  assert.equal(aegis(dir, ['remove']).status, 0);
});
