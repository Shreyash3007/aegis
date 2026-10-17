// Host capability surface (v0.11 contracts PR): the command exists, is
// read-only, and refuses unknown hosts. R2 adds declaration data plus its own
// suite; this file asserts the surface contract, not the declaration count.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scratch, aegis } from './helpers.js';

test('host list exits 0 and prints at least the empty-set note', (t) => {
  const dir = scratch(t);
  const r = aegis(dir, ['host', 'list']);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(r.stdout.trim().length > 0, 'list output is never empty');
});

test('host inspect refuses a missing or unknown id (exit 2, no partial work)', (t) => {
  const dir = scratch(t);
  assert.equal(aegis(dir, ['host', 'inspect']).status, 2);
  const r = aegis(dir, ['host', 'inspect', 'not-a-host']);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /unknown host/);
});

test('host with no subcommand prints usage (exit 2)', (t) => {
  const dir = scratch(t);
  const r = aegis(dir, ['host']);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /usage: aegis host/);
});
