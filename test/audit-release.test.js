import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scratch, aegis, gitIn, readState, writeState } from './helpers.js';

test('audit: a ship approval cannot authorize a later source commit', (t) => {
  const dir = scratch(t);
  const s = readState(dir);
  s.current_skill = '08a';
  writeState(dir, s);
  const env = { AEGIS_HUMAN_TOKEN: 'synthetic-test-fixture' };
  assert.equal(aegis(dir, ['gate', 'G4', '--approve'], { env }).status, 0);
  gitIn(dir, ['commit', '--allow-empty', '-m', 'a new unapproved candidate']);
  const refused = aegis(dir, ['transition', '08b']);
  assert.equal(refused.status, 4, refused.stderr + refused.stdout);
  assert.match(refused.stderr, /ship approval.*stale|G4.*(?:commit|re-approve)/i);
  assert.equal(aegis(dir, ['gate', 'G4', '--approve'], { env }).status, 0);
  assert.equal(aegis(dir, ['transition', '08b']).status, 0);
});
