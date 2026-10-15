import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { scratch, aegis, gitIn, readState, writeState } from './helpers.js';

function setup(t) {
  const dir = scratch(t);
  gitIn(dir, ['add', '.gitignore', 'brain']);
  gitIn(dir, ['commit', '-m', 'scaffold']);
  gitIn(dir, ['switch', '-c', 'feature']);
  fs.writeFileSync(path.join(dir, 'feature.cjs'), 'module.exports = 1;\n');
  fs.writeFileSync(path.join(dir, 'acceptance.json'), JSON.stringify({ criteria: [
    { id: 'AC1', statement: 'feature returns one', command: [process.execPath, '-e', "require('node:assert/strict').equal(require('./feature.cjs'), 1)"] },
  ] }));
  fs.writeFileSync(path.join(dir, 'review.json'), JSON.stringify({ findings: [
    { id: 'F1', severity: 'major', status: 'open', evidence: ['feature.cjs'], summary: 'check the contract' },
  ] }));
  gitIn(dir, ['add', 'feature.cjs', 'acceptance.json', 'review.json']);
  gitIn(dir, ['commit', '-m', 'feature and quality plan']);
  return dir;
}

test('quality: actual acceptance results and open major findings block merges', (t) => {
  const dir = setup(t);
  const accept = aegis(dir, ['quality', 'acceptance', 'feature', '--file', 'acceptance.json']);
  assert.equal(accept.status, 0, accept.stdout + accept.stderr);
  assert.match(accept.stdout, /1\/1 acceptance checks passed/);
  const review = aegis(dir, ['quality', 'review', 'feature', '--file', 'review.json']);
  assert.equal(review.status, 9, review.stdout + review.stderr);
  assert.match(review.stderr, /major/);
  gitIn(dir, ['switch', 'main']);
  const refused = aegis(dir, ['merge', 'check', 'feature']);
  assert.equal(refused.status, 9, refused.stderr);
  assert.match(refused.stderr, /review.*major/i);
});

test('quality: clean review plus acceptance permits strict merge; subsequent commits stale both', (t) => {
  const dir = setup(t);
  fs.writeFileSync(path.join(dir, 'review.json'), JSON.stringify({ findings: [] }));
  gitIn(dir, ['add', 'review.json']);
  gitIn(dir, ['commit', '-m', 'review issues addressed']);
  assert.equal(aegis(dir, ['quality', 'acceptance', 'feature', '--file', 'acceptance.json']).status, 0);
  assert.equal(aegis(dir, ['quality', 'review', 'feature', '--file', 'review.json']).status, 0);
  gitIn(dir, ['switch', 'main']);
  const green = aegis(dir, ['merge', 'check', 'feature', '--require-quality']);
  assert.equal(green.status, 0, green.stdout + green.stderr);
  gitIn(dir, ['switch', 'feature']);
  gitIn(dir, ['commit', '--allow-empty', '-m', 'new snapshot']);
  gitIn(dir, ['switch', 'main']);
  const stale = aegis(dir, ['clean', 'feature', '--require-quality']);
  assert.equal(stale.status, 9, stale.stderr);
  assert.match(stale.stderr, /STALE/);
});

test('quality: absent evidence, malformed plans and failed outcomes never earn PASS', (t) => {
  const dir = setup(t);
  gitIn(dir, ['switch', 'main']);
  assert.equal(aegis(dir, ['merge', 'check', 'feature', '--require-quality']).status, 9);
  gitIn(dir, ['switch', 'feature']);
  fs.writeFileSync(path.join(dir, 'acceptance.json'), JSON.stringify({ criteria: [] }));
  gitIn(dir, ['add', 'acceptance.json']);
  gitIn(dir, ['commit', '-m', 'invalid plan']);
  assert.equal(aegis(dir, ['quality', 'acceptance', 'feature', '--file', 'acceptance.json']).status, 2);
  fs.writeFileSync(path.join(dir, 'acceptance.json'), JSON.stringify({ criteria: [
    { id: 'AC1', statement: 'expected failure', command: [process.execPath, '-e', 'process.exit(1)'] },
  ] }));
  gitIn(dir, ['add', 'acceptance.json']);
  gitIn(dir, ['commit', '-m', 'failing check']);
  assert.equal(aegis(dir, ['quality', 'acceptance', 'feature', '--file', 'acceptance.json']).status, 9);
});

test('quality: strict ship entry refuses absent evidence despite an approved ship gate', (t) => {
  const dir = setup(t);
  const s = readState(dir);
  s.current_skill = '08a';
  s.gates.G4 = { status: 'approved', by: 'test-fixture', at: 'fixture' };
  writeState(dir, s);
  const r = aegis(dir, ['transition', '08b', '--require-quality']);
  assert.equal(r.status, 4, r.stdout + r.stderr);
  assert.match(r.stderr, /QUALITY acceptance evidence missing/);
  assert.equal(readState(dir).current_skill, '08a');
});
