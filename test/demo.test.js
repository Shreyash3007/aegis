// Demo-approval gate + prototype track (SPEC §10): artifact recording,
// DEMO-gated 04a entries, re-record iteration, raw slice mechanics untouched.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { scratch, aegis, readState, writeState } from './helpers.js';

const token = { AEGIS_HUMAN_TOKEN: '1' };

function at03b(t) {
  const dir = scratch(t);
  const s = readState(dir);
  s.current_skill = '03b';
  s.contracts_merged = true; // isolate the DEMO blocker from N1
  writeState(dir, s);
  return dir;
}

test('demo record: UI kind requires a real .html prototype', (t) => {
  const dir = scratch(t);
  fs.writeFileSync(path.join(dir, 'notes.txt'), 'not a prototype');
  const noHtml = aegis(dir, ['demo', 'record', '--kind', 'ui', '--file', 'notes.txt']);
  assert.equal(noHtml.status, 2, noHtml.stderr);
  assert.match(noHtml.stderr, /\.html prototype/);
  const missing = aegis(dir, ['demo', 'record', '--kind', 'ui', '--file', 'demo.html']);
  assert.equal(missing.status, 2, missing.stderr);
  assert.match(missing.stderr, /demo artifact missing/);
  fs.writeFileSync(path.join(dir, 'demo.html'), '<!doctype html><title>demo</title>');
  const r = aegis(dir, ['demo', 'record', '--kind', 'ui', '--file', 'demo.html']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /demo recorded: ui \[demo\.html\]/);
  assert.match(r.stdout, /gate DEMO --approve/);
  assert.equal(readState(dir).demo.kind, 'ui');
});

test('demo record: contract kind pins existing files; status shows gate', (t) => {
  const dir = scratch(t);
  fs.writeFileSync(path.join(dir, 'sequence.md'), 'a -> b');
  const r = aegis(dir, ['demo', 'record', '--kind', 'contract', '--file', 'sequence.md']);
  assert.equal(r.status, 0, r.stderr);
  const s = aegis(dir, ['demo', 'status']);
  assert.match(s.stdout, /demo: contract \[sequence\.md\]/);
  assert.match(s.stdout, /gate DEMO: OPEN - production lanes stay shut/);
});

test('transition 04a refuses on OPEN DEMO; token approval unlocks it', (t) => {
  const dir = at03b(t);
  const blocked = aegis(dir, ['transition', '04a']);
  assert.equal(blocked.status, 4, blocked.stderr);
  assert.match(blocked.stderr, /gate DEMO .* OPEN/);
  fs.writeFileSync(path.join(dir, 'demo.html'), '<!doctype html>');
  assert.equal(aegis(dir, ['demo', 'record', '--kind', 'ui', '--file', 'demo.html']).status, 0);
  assert.equal(aegis(dir, ['gate', 'DEMO', '--approve'], { env: token }).status, 0);
  const go = aegis(dir, ['transition', '04a']);
  assert.equal(go.status, 0, go.stderr);
  assert.match(go.stdout, /transition 03b -> 04a recorded/);
  assert.match(aegis(dir, ['demo', 'status']).stdout, /gate DEMO: approved/);
});

test('demo re-record supersedes (the unbounded iterate loop), history keeps both', (t) => {
  const dir = scratch(t);
  fs.writeFileSync(path.join(dir, 'v1.html'), 'v1');
  fs.writeFileSync(path.join(dir, 'v2.html'), 'v2');
  assert.equal(aegis(dir, ['demo', 'record', '--kind', 'ui', '--file', 'v1.html']).status, 0);
  const r = aegis(dir, ['demo', 'record', '--kind', 'ui', '--file', 'v2.html']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /supersedes prior demo record/);
  const s = readState(dir);
  assert.deepEqual(s.demo.files, ['v2.html']);
  const events = s.history.map((h) => h.event ?? '');
  assert.equal(events.filter((e) => e.startsWith('demo-record')).length, 2);
});

test('06d -> 04a entry is DEMO-gated too (no side door into lanes)', (t) => {
  const dir = scratch(t);
  const s = readState(dir);
  s.current_skill = '06d';
  s.contracts_merged = true;
  writeState(dir, s);
  const blocked = aegis(dir, ['transition', '04a']);
  assert.equal(blocked.status, 4, blocked.stderr);
  assert.match(blocked.stderr, /gate DEMO .* OPEN/);
});
