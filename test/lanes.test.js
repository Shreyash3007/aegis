// Lane cap (N5): default cap is 2; the third slice is refused.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { scratch, aegis, CLI } from './helpers.js';

test('lane cap: two slices open, third refused (exit 4)', (t) => {
  const dir = scratch(t);
  for (const name of ['alpha', 'beta']) {
    const r = aegis(dir, ['slice', 'create', name]);
    assert.equal(r.status, 0, r.stderr);
  }
  const third = aegis(dir, ['slice', 'create', 'gamma']);
  assert.equal(third.status, 4);
  assert.match(third.stderr, /LANE CAP: 2\/2/);
});

test('slice create: duplicate name refused without orphaned worktree', (t) => {
  const dir = scratch(t);
  assert.equal(aegis(dir, ['slice', 'create', 'dup']).status, 0);
  const r = aegis(dir, ['slice', 'create', 'dup']);
  assert.equal(r.status, 4, r.stderr);
  assert.match(r.stderr, /slice already registered: dup/);
  const list = aegis(dir, ['slice', 'list']).stdout;
  assert.equal(list.split('\n').filter((l) => l.includes('dup ->')).length, 1);
});

test('slice create: concurrent creators keep state consistent (lock discipline)', async (t) => {
  const dir = scratch(t);
  // Cap is 2: race 4 creators. Exactly 2 must win; losers exit 4 with the
  // cap message AND roll back their worktrees (no orphans, no lost updates).
  const runs = await Promise.all(['w1', 'w2', 'w3', 'w4'].map((n) => new Promise((res) => {
    const p = spawn(process.execPath, [CLI, 'slice', 'create', n], { cwd: dir, env: process.env });
    let err = '';
    p.stderr.on('data', (d) => { err += d; });
    p.on('close', (code) => res({ code, err, n }));
  })));
  const won = runs.filter((r) => r.code === 0);
  const lost = runs.filter((r) => r.code === 4);
  assert.equal(won.length, 2, JSON.stringify(runs.map((r) => [r.n, r.code])));
  assert.equal(lost.length, 2);
  for (const r of lost) assert.match(r.err, /LANE CAP/);
  const s = JSON.parse(fs.readFileSync(path.join(dir, '.aegis', 'state.json'), 'utf8'));
  assert.equal(Object.keys(s.slices ?? {}).length, 2);
  assert.equal(s.lanes.active.length, 2);
});
