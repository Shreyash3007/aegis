// Checkpoint integrity + audited loops reset.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scratch, aegis, readState, writeState } from './helpers.js';

test('tampered state.json detected (exit 6); fresh checkpoint verifies (exit 0)', (t) => {
  const dir = scratch(t);
  assert.equal(aegis(dir, ['checkpoint']).status, 0);
  const s = readState(dir);
  s.current_skill = '00b'; // hand-edit ground truth behind the runtime's back
  writeState(dir, s);
  const bad = aegis(dir, ['resume']);
  assert.equal(bad.status, 6);
  assert.match(bad.stderr, /INTEGRITY MISMATCH/);
  assert.match(bad.stderr, /MODIFIED: \.aegis\/state\.json/);
  assert.equal(aegis(dir, ['checkpoint']).status, 0);
  const good = aegis(dir, ['resume']);
  assert.equal(good.status, 0, good.stderr);
  assert.match(good.stdout, /integrity: VERIFIED/);
});

test('loops reset: --reason mandatory, audited in history, checkpoint stays verifiable', (t) => {
  const dir = scratch(t);
  aegis(dir, ['transition', '00b']); // create a loop counter to be cleared
  const noReason = aegis(dir, ['loops', 'reset']);
  assert.equal(noReason.status, 4);
  assert.match(noReason.stderr, /requires --reason/);
  const okReset = aegis(dir, ['loops', 'reset', '--reason', 'human review: counters stale']);
  assert.equal(okReset.status, 0, okReset.stderr);
  const s = readState(dir);
  const entry = s.history.findLast((h) => h.event === 'loops-reset');
  assert.ok(entry, 'loops-reset recorded in state history');
  assert.equal(entry.reason, 'human review: counters stale');
  assert.ok(entry.cleared.length > 0, 'cleared counters listed in the audit entry');
  assert.deepEqual(s.loop_counters, {});
  assert.deepEqual(s.state_visits, {});
  assert.equal(aegis(dir, ['checkpoint']).status, 0);
  const resumed = aegis(dir, ['resume']);
  assert.equal(resumed.status, 0, resumed.stderr);
  assert.match(resumed.stdout, /VERIFIED/);
});
