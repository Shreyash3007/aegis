import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { scratch, aegis, gitIn } from './helpers.js';

function fixture(t) {
  const dir = scratch(t);
  fs.writeFileSync(path.join(dir, 'shared.cjs'), 'module.exports = 1;\n');
  gitIn(dir, ['add', '.gitignore', 'brain', 'shared.cjs']);
  gitIn(dir, ['commit', '-m', 'commit scaffold on base before branching']);
  gitIn(dir, ['switch', '-c', 'feature']);
  fs.writeFileSync(path.join(dir, 'behavior.cjs'), 'module.exports = 0;\n');
  fs.writeFileSync(path.join(dir, 'check.cjs'),
    "const a = require('node:assert/strict'); a.equal(require('./behavior.cjs'), 1); a.equal(require('./shared.cjs'), 1);\n");
  gitIn(dir, ['add', '.gitignore', 'brain', 'behavior.cjs', 'check.cjs']);
  gitIn(dir, ['commit', '-m', 'regression test (red)']);
  return dir;
}

const red = (dir, extra = []) => aegis(dir, ['tdd', 'red', 'feature',
  '--test-file', 'check.cjs', '--expect-exit', '1', ...extra,
  '--', process.execPath, 'check.cjs']);

test('TDD: records actual RED then GREEN, and strict oracle accepts the pinned tip', (t) => {
  const dir = fixture(t);
  const r = red(dir);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /RED recorded/);
  const before = aegis(dir, ['tdd', 'green', 'feature']);
  assert.equal(before.status, 9, before.stderr);
  fs.writeFileSync(path.join(dir, 'behavior.cjs'), 'module.exports = 1;\n');
  gitIn(dir, ['add', 'behavior.cjs']);
  gitIn(dir, ['commit', '-m', 'minimal fix (green)']);
  assert.equal(aegis(dir, ['tdd', 'green', 'feature']).status, 0);
  assert.match(aegis(dir, ['tdd', 'status', 'feature']).stdout, /VERIFIED/);
  gitIn(dir, ['switch', 'main']);
  const merge = aegis(dir, ['merge', 'check', 'feature', '--require-proof']);
  assert.equal(merge.status, 0, merge.stderr + merge.stdout);
  assert.match(merge.stdout, /RED.*GREEN/);
});

test('TDD: missing proof, fabricated failure and a changed test are refused', (t) => {
  const dir = fixture(t);
  gitIn(dir, ['switch', 'main']);
  const absent = aegis(dir, ['merge', 'check', 'feature', '--require-proof']);
  assert.equal(absent.status, 9, absent.stderr);
  assert.match(absent.stderr, /TDD proof missing/);
  gitIn(dir, ['switch', 'feature']);
  assert.equal(red(dir, ['--expect-exit', '2']).status, 9, 'wrong exit does not count as RED');
  const captured = red(dir);
  assert.equal(captured.status, 0, captured.stdout + captured.stderr);
  fs.writeFileSync(path.join(dir, 'check.cjs'), '// deleted assertion\n');
  gitIn(dir, ['add', 'check.cjs']);
  gitIn(dir, ['commit', '-m', 'weakened test']);
  const weakened = aegis(dir, ['tdd', 'green', 'feature']);
  assert.equal(weakened.status, 9, weakened.stderr);
  assert.match(weakened.stderr, /test changed/);
});

test('TDD: receipts expire after new commits; timeout and bad executable cannot count as RED', (t) => {
  const dir = fixture(t);
  const missing = aegis(dir, ['tdd', 'red', 'feature', '--test-file', 'check.cjs',
    '--expect-exit', '1', '--', 'aegis-no-such-executable']);
  assert.equal(missing.status, 9, missing.stderr);
  const timeout = aegis(dir, ['tdd', 'red', 'feature', '--test-file', 'check.cjs',
    '--expect-exit', '1', '--timeout-ms', '50', '--', process.execPath,
    '-e', 'setTimeout(() => {}, 1000)']);
  assert.equal(timeout.status, 9, timeout.stderr);
  assert.equal(red(dir).status, 0);
  fs.writeFileSync(path.join(dir, 'behavior.cjs'), 'module.exports = 1;\n');
  gitIn(dir, ['add', 'behavior.cjs']);
  gitIn(dir, ['commit', '-m', 'fix']);
  assert.equal(aegis(dir, ['tdd', 'green', 'feature']).status, 0);
  gitIn(dir, ['commit', '--allow-empty', '-m', 'later changes']);
  assert.match(aegis(dir, ['tdd', 'status', 'feature']).stdout, /STALE/);
  gitIn(dir, ['switch', 'main']);
  assert.equal(aegis(dir, ['clean', 'feature', '--require-proof']).status, 9);
});

test('TDD: branch GREEN cannot hide an integration failure introduced on base', (t) => {
  const dir = fixture(t);
  assert.equal(red(dir).status, 0);
  fs.writeFileSync(path.join(dir, 'behavior.cjs'), 'module.exports = 1;\n');
  gitIn(dir, ['add', 'behavior.cjs']);
  gitIn(dir, ['commit', '-m', 'fix']);
  assert.equal(aegis(dir, ['tdd', 'green', 'feature']).status, 0);
  gitIn(dir, ['switch', 'main']);
  fs.writeFileSync(path.join(dir, 'shared.cjs'), 'module.exports = 0;\n');
  gitIn(dir, ['add', 'shared.cjs']);
  gitIn(dir, ['commit', '-m', 'base changes dependency behavior']);
  const r = aegis(dir, ['merge', 'check', 'feature', '--require-proof']);
  assert.equal(r.status, 9, r.stderr);
  assert.match(r.stderr, /TDD integrated test FAILED/);
});
