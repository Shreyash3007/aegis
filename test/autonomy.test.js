import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { classifyAction } from '../dist/lib/autonomy.js';
import { scratch, aegis, readState, writeState } from './helpers.js';

test('autonomy: sensitive work cannot use fix/chore, even with a CI approval token', (t) => {
  const dir = scratch(t);
  for (const args of [
    ['fix', 'start', 'change production credentials'],
    ['chore', 'update payment authorization'],
  ]) {
    const before = fs.readFileSync(path.join(dir, '.aegis', 'state.json'), 'utf8');
    const r = aegis(dir, args, { env: { AEGIS_HUMAN_TOKEN: '1' } });
    assert.equal(r.status, 4, r.stdout + r.stderr);
    assert.match(r.stderr, /L0.*pipeline/);
    assert.equal(fs.readFileSync(path.join(dir, '.aegis', 'state.json'), 'utf8'), before);
    assert.ok(!fs.existsSync(path.join(dir, '.aegis', 'state.json.lock')), 'refusal leaves no lock');
  }
});

test('autonomy: ordinary descriptions retain defaults without substring false positives', (t) => {
  assert.equal(classifyAction('chore: keyboard layout').level, 'L2');
  assert.equal(classifyAction('fix: author caption').level, 'L2');
  assert.equal(classifyAction('investigate rendering').level, 'L1');
  for (const noun of ['credentials', 'payments', 'authorization', 'secrets', 'migrations'])
    assert.equal(classifyAction(`change ${noun}`).level, 'L0', noun);
  const dir = scratch(t);
  assert.equal(aegis(dir, ['chore', 'keyboard layout']).status, 0);
  assert.equal(readState(dir).fix.log.at(-1).autonomy, 'L2');
});

test('autonomy: transitions record the destination phase level', (t) => {
  const dir = scratch(t);
  assert.equal(aegis(dir, ['transition', '00b']).status, 0);
  assert.equal(readState(dir).history.at(-1).autonomy, 'L1');
  const s = readState(dir);
  s.current_skill = '07c';
  writeState(dir, s);
  assert.equal(aegis(dir, ['transition', '08a']).status, 0);
  assert.equal(readState(dir).history.at(-1).autonomy, 'L0');
  assert.match(aegis(dir, ['status']).stdout, /autonomy: L0/);
});

test('autonomy: ship approval cannot be self-approved by autonomy=full', (t) => {
  const dir = scratch(t);
  assert.equal(aegis(dir, ['config', 'set', 'autonomy', 'full']).status, 0);
  const r = aegis(dir, ['gate', 'G4', '--approve']);
  assert.equal(r.status, 7, r.stdout + r.stderr);
  assert.match(r.stderr, /L0/);
  assert.equal(aegis(dir, ['gate', 'G4', '--approve'], { env: { AEGIS_HUMAN_TOKEN: '1' } }).status, 0);
});
