// status --markdown: portable, deterministic handoff (brain/handoff.md).
// The handoff lives in brain/ so it is checkpoint-hashed -> must be byte-
// deterministic (A1.2: no timestamps/dates; same state in, same bytes out).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { scratch, aegis } from './helpers.js';

const handoffPath = (dir) => path.join(dir, 'brain', 'handoff.md');

test('status --markdown writes brain/handoff.md with skill + checkpoint id; deterministic', (t) => {
  const dir = scratch(t);
  // Make a checkpoint so the handoff has a real id + git SHA to report.
  const cp = aegis(dir, ['checkpoint']);
  assert.equal(cp.status, 0, cp.stderr);
  const id = (cp.stdout.match(/cp-\d+/) || [])[0];
  assert.ok(id, 'checkpoint id printed');

  const r = aegis(dir, ['status', '--markdown']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /OK handoff written to brain\/handoff\.md/);
  assert.ok(fs.existsSync(handoffPath(dir)), 'handoff file written');

  const content = fs.readFileSync(handoffPath(dir), 'utf8');
  assert.match(content, /current skill: 00a/);
  assert.ok(content.includes(id), 'handoff contains the checkpoint id');
  // Normal status output is unchanged alongside the markdown write.
  assert.match(r.stdout, /state: 00a/);

  // A1.2: no ISO-style timestamps/dates anywhere in hashed brain content.
  assert.doesNotMatch(content, /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, 'no ISO date in handoff');

  // Determinism: unchanged state -> byte-identical output on a second run.
  const r2 = aegis(dir, ['status', '--markdown']);
  assert.equal(r2.status, 0, r2.stderr);
  const content2 = fs.readFileSync(handoffPath(dir), 'utf8');
  assert.equal(content, content2, 'second run produces byte-identical handoff');
});

test('status --markdown reflects a moved pipeline position (no stale handoff)', (t) => {
  const dir = scratch(t);
  aegis(dir, ['transition', '00b']);
  aegis(dir, ['checkpoint', '--quiet']);
  assert.equal(aegis(dir, ['status', '--markdown']).status, 0);
  const content = fs.readFileSync(handoffPath(dir), 'utf8');
  assert.match(content, /current skill: 00b/);
  // No ISO date even after a transition (state.json carries timestamps, but
  // the handoff must not echo them).
  assert.doesNotMatch(content, /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
});
