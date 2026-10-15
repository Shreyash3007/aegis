import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { scratch, aegis, gitIn } from './helpers.js';

test('audit: validate acceptance delegates to real committed quality checks and preserves failure exits', (t) => {
  const dir = scratch(t);
  const plan = (exit) => JSON.stringify({ criteria: [{ id: 'AC1', statement: 'observable fixture outcome', command: [process.execPath, '-e', `process.exit(${exit})`] }] });
  fs.writeFileSync(path.join(dir, 'acceptance.json'), plan(0));
  gitIn(dir, ['add', '.gitignore', 'brain', 'acceptance.json']);
  gitIn(dir, ['commit', '-m', 'acceptance plan']);
  const pass = aegis(dir, ['validate', 'acceptance', 'main', '--file', 'acceptance.json']);
  assert.equal(pass.status, 0, pass.stderr + pass.stdout);
  assert.match(pass.stdout, /1\/1 acceptance checks passed/);
  fs.writeFileSync(path.join(dir, 'acceptance.json'), plan(1));
  gitIn(dir, ['add', 'acceptance.json']); gitIn(dir, ['commit', '-m', 'failing outcome']);
  assert.equal(aegis(dir, ['validate', 'acceptance', 'main', '--file', 'acceptance.json']).status, 9);
  assert.equal(aegis(dir, ['config', 'set', 'validate_suite.acceptance', 'echo fake-pass']).status, 2);
});
