// Brownfield-adoption fixes from the metis-nda hands-on trial:
// 1. `aegis sync` must never truncate hand-written AGENTS.md/CLAUDE.md -
//    it owns only the marked AEGIS block.
// 2. `aegis init --yes` must detect an established codebase as brownfield
//    (evidence: git history / tracked code mass), not default greenfield.
// 3. autonomy=full must be honored by gates non-TTY (the config key was
//    collected at init but never read by enforcement - a recorded lie).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { scratch, gitIn, aegis, readState } from './helpers.js';

test('sync preserves hand-written CLAUDE.md content outside the AEGIS block', (t) => {
  const dir = scratch(t);
  const mine = '# My Project\n\n## Active Right Now\nRich narrative context built over months.\n';
  fs.writeFileSync(path.join(dir, 'CLAUDE.md'), mine);
  const r = aegis(dir, ['sync']);
  assert.equal(r.status, 0, r.stderr);
  const after = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8');
  assert.ok(after.includes('## Active Right Now'), 'hand-written content survives');
  assert.ok(after.includes('Rich narrative context built over months.'));
  assert.match(after, /<!-- AEGIS:BEGIN/);
  assert.match(after, /<!-- AEGIS:END -->/);
  assert.ok(!fs.existsSync(path.join(dir, 'CLAUDE.md.bak')), 'no .bak shuffle - nothing overwritten');
});

test('sync twice: block regenerates, outside content byte-identical', (t) => {
  const dir = scratch(t);
  const mine = '# Team Notes\nDo not lose this.\n';
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), mine);
  aegis(dir, ['sync']);
  const once = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');
  const r = aegis(dir, ['sync']);
  assert.equal(r.status, 0, r.stderr);
  const twice = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');
  assert.ok(twice.includes('Do not lose this.'));
  assert.equal(twice, once, 'deterministic: same brain in -> same bytes out');
});

test('init --yes on an established repo detects brownfield', (t) => {
  const dir = scratch(t, { init: false });
  for (let i = 0; i < 6; i++) { // >5 commits = established history
    fs.writeFileSync(path.join(dir, `f${i}.txt`), `${i}\n`);
    gitIn(dir, ['add', '-A']);
    gitIn(dir, ['commit', '-q', '-m', `c${i}`]);
  }
  const r = aegis(dir, ['init', '--yes']);
  assert.equal(r.status, 0, r.stderr);
  const cfg = JSON.parse(fs.readFileSync(path.join(dir, '.aegis', 'config.json'), 'utf8'));
  assert.equal(cfg.project_type, 'brownfield');
  assert.match(`${r.stdout}${r.stderr}`, /brownfield detected/);
});

test('init --yes on a fresh repo stays greenfield', (t) => {
  const dir = scratch(t); // 1 empty commit
  const cfg = JSON.parse(fs.readFileSync(path.join(dir, '.aegis', 'config.json'), 'utf8'));
  assert.equal(cfg.project_type, 'greenfield');
});

test('gate --approve non-TTY under autonomy=full succeeds and is attributed', (t) => {
  const dir = scratch(t);
  const c = aegis(dir, ['config', 'set', 'autonomy', 'full']);
  assert.equal(c.status, 0, c.stderr);
  const r = aegis(dir, ['gate', 'PRD', '--approve']); // no TTY, no token
  assert.equal(r.status, 0, `stdout: ${r.stdout}\nstderr: ${r.stderr}`);
  assert.equal(readState(dir).gates.PRD.by, 'autonomy-full');
});

test('gate --approve non-TTY under autonomy=semi still refuses', (t) => {
  const dir = scratch(t); // default autonomy is semi
  const r = aegis(dir, ['gate', 'PRD', '--approve']);
  assert.equal(r.status, 7);
  assert.match(r.stderr, /needs a human on a TTY/);
});
