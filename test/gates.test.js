// Gate proof-of-human: name validation + non-TTY refusal without the token.
// stdin is a pipe in every test (spawnSync default), which is exactly the
// non-TTY posture the gate is designed to refuse.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scratch, aegis } from './helpers.js';

test('unknown gate name -> exit 7', (t) => {
  const dir = scratch(t);
  const r = aegis(dir, ['gate', 'NOPE', '--approve'], { env: { AEGIS_HUMAN_TOKEN: '1' } });
  assert.equal(r.status, 7);
  assert.match(r.stderr, /unknown gate: NOPE/);
});

test('non-TTY gate approve without AEGIS_HUMAN_TOKEN -> exit 7', (t) => {
  const dir = scratch(t);
  const r = aegis(dir, ['gate', 'PRD', '--approve']);
  assert.equal(r.status, 7);
  assert.match(r.stderr, /needs a human on a TTY/);
  assert.match(r.stderr, /AEGIS_HUMAN_TOKEN/);
});
