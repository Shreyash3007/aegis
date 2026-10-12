// aegis sync merges the CLI's transitions invariant forward: old installs
// without the DEMO gate adopt it on 04a entries; custom edges survive.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { scratch, aegis } from './helpers.js';

const transP = (dir) => path.join(dir, '.aegis', 'transitions.json');
const readT = (dir) => JSON.parse(fs.readFileSync(transP(dir), 'utf8'));

test('sync: current installs report already-current, graph intact', (t) => {
  const dir = scratch(t);
  const r = aegis(dir, ['sync']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /transitions\.json already current/);
  assert.equal(readT(dir).gates.DEMO, 'demo-approval');
});

test('sync: old install without DEMO merges forward, custom edges preserved', (t) => {
  const dir = scratch(t);
  const tr = readT(dir);
  delete tr.gates.DEMO; // simulate a pre-0.6 install
  for (const e of tr.edges) if (e.to === '04a') delete e.gate;
  tr.edges.push({ from: '04a', to: '04c', note: 'custom shortcut' });
  fs.writeFileSync(transP(dir), JSON.stringify(tr, null, 2) + '\n');
  const r = aegis(dir, ['sync']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /merged forward/);
  const after = readT(dir);
  assert.equal(after.gates.DEMO, 'demo-approval');
  for (const e of after.edges.filter((e) => e.to === '04a'))
    assert.equal(e.gate, 'DEMO', `04a entry ${e.from}->${e.to} gated`);
  const custom = after.edges.find((e) => e.note === 'custom shortcut');
  assert.ok(custom, 'custom edge preserved');
  assert.equal(custom.gate, undefined, 'non-04a custom edge untouched');
});
