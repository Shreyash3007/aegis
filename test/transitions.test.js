// Transition enforcement: legal/illegal edges, gate-blocked edges, rollback edges.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scratch, aegis, readState, writeState } from './helpers.js';

test('illegal transition refused (exit 4), legal transition ok (exit 0)', (t) => {
  const dir = scratch(t);
  const bad = aegis(dir, ['transition', '01a']); // no edge 00a -> 01a
  assert.equal(bad.status, 4);
  assert.match(bad.stderr, /ILLEGAL transition 00a -> 01a/);
  const good = aegis(dir, ['transition', '00b']); // edge 00a -> 00b exists
  assert.equal(good.status, 0, good.stderr);
});

test('gate-blocked transition refused while gate OPEN; token approval unlocks it', (t) => {
  const dir = scratch(t);
  assert.equal(aegis(dir, ['transition', '00b']).status, 0);
  assert.equal(aegis(dir, ['transition', '01a']).status, 0);
  const blocked = aegis(dir, ['transition', '01b']); // edge 01a -> 01b gated by PRD
  assert.equal(blocked.status, 4);
  assert.match(blocked.stderr, /gate PRD .* OPEN/);
  const approve = aegis(dir, ['gate', 'PRD', '--approve'], { env: { AEGIS_HUMAN_TOKEN: '1' } });
  assert.equal(approve.status, 0, approve.stderr);
  const now = aegis(dir, ['transition', '01b']);
  assert.equal(now.status, 0, now.stderr);
});

test('backward transition requires --reason (rollback edge 01b -> 01a)', (t) => {
  const dir = scratch(t);
  aegis(dir, ['transition', '00b']);
  aegis(dir, ['transition', '01a']);
  aegis(dir, ['gate', 'PRD', '--approve'], { env: { AEGIS_HUMAN_TOKEN: '1' } });
  assert.equal(aegis(dir, ['transition', '01b']).status, 0);
  const noReason = aegis(dir, ['transition', '01a']);
  assert.equal(noReason.status, 4);
  assert.match(noReason.stderr, /Backward transition requires --reason/);
  const withReason = aegis(dir, ['transition', '01a', '--reason', 'scope found PRD gap']);
  assert.equal(withReason.status, 0, withReason.stderr);
});

test('contract-gap rollback 04a -> 03a requires --reason (exit 4 without, 0 with)', (t) => {
  const dir = scratch(t);
  const s = readState(dir);
  s.current_skill = '04a'; // mid-build, as the 04-build team templates run
  writeState(dir, s);
  const noReason = aegis(dir, ['transition', '03a']);
  assert.equal(noReason.status, 4);
  assert.match(noReason.stderr, /Backward transition requires --reason/);
  const withReason = aegis(dir, ['transition', '03a', '--reason', 'contract gap: missing endpoint']);
  assert.equal(withReason.status, 0, withReason.stderr);
});

test('contract-gap rollback 04a -> 02b (redesign contracts) legal with --reason', (t) => {
  const dir = scratch(t);
  const s = readState(dir);
  s.current_skill = '04a';
  writeState(dir, s);
  const noReason = aegis(dir, ['transition', '02b']);
  assert.equal(noReason.status, 4);
  assert.match(noReason.stderr, /Backward transition requires --reason/);
  const withReason = aegis(dir, ['transition', '02b', '--reason', 'contract gap: schema cannot express DTO']);
  assert.equal(withReason.status, 0, withReason.stderr);
});
