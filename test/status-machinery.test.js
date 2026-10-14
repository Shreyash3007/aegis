// Conductor visibility (v0.6.0 machinery in status): quarantine, clean
// cycles, demo record, and memory summary surface on status and in the
// deterministic handoff. Empty machinery prints nothing (stock output
// byte-stable for all pre-existing tests).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { scratch, aegis, gitIn } from './helpers.js';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

function seedMachinery(dir) {
  gitIn(dir, ['checkout', '-qb', 'feature']);
  fs.writeFileSync(path.join(dir, 'f.txt'), 'branch');
  gitIn(dir, ['add', 'f.txt']);
  gitIn(dir, ['commit', '-q', '-m', 'branch']);
  gitIn(dir, ['checkout', '-q', 'main']);
  fs.writeFileSync(path.join(dir, 'f.txt'), 'main');
  gitIn(dir, ['add', 'f.txt']);
  gitIn(dir, ['commit', '-q', '-m', 'main']);
  assert.equal(aegis(dir, ['clean', 'feature']).status, 9);
  assert.equal(aegis(dir, ['quarantine', 'freeze', 'feature', '--reason', 'test freeze']).status, 0);
  fs.writeFileSync(path.join(dir, 'demo.html'), '<!doctype html>');
  assert.equal(aegis(dir, ['demo', 'record', '--kind', 'ui', '--file', 'demo.html']).status, 0);
  assert.equal(aegis(dir, ['memory', 'add', '--type', 'finding', '--title', 't', '--body', 'b']).status, 0);
}

test('status surfaces quarantine, clean cycles, demo, and memory', (t) => {
  const dir = scratch(t);
  const bare = aegis(dir, ['status']).stdout;
  assert.doesNotMatch(bare, /quarantine FROZEN/);
  assert.doesNotMatch(bare, /clean FAILING/);
  assert.doesNotMatch(bare, /^demo: /m);
  seedMachinery(dir);
  const out = aegis(dir, ['status']).stdout;
  assert.match(out, /quarantine FROZEN: feature \(-> feature\): test freeze/);
  assert.match(out, /clean FAILING: feature \(cycle 1\/3: TEXT-CONFLICT\)/);
  assert.match(out, /demo: ui \[demo\.html\]/);
  assert.match(out, /memory: 1 active, 0 stale \(re-verify\), 0 open reconciles/);
});

test('worktree without .aegis points back at main (never suggests a forked init)', (t) => {
  const dir = scratch(t);
  const wt = path.join(path.dirname(dir), `${path.basename(dir)}-wt`);
  t.after(() => {
    spawnSync('git', ['worktree', 'remove', '--force', wt], { cwd: dir });
    fs.rmSync(wt, { recursive: true, force: true });
  });
  gitIn(dir, ['worktree', 'add', wt, '-b', 'probe']);
  const child = spawnSync(process.execPath,
    [path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'cli.js'), 'status'],
    { cwd: wt, encoding: 'utf8' });
  assert.equal(child.status, 2);
  assert.match(child.stderr, /slice worktree; aegis state lives in the main checkout/);
  // The named checkout must be REAL (8.3 short-vs-long paths differ per
  // platform, so verify existence + state instead of string equality).
  const named = (child.stderr.match(/main checkout \(([^)]+)\)/) || [])[1];
  assert.ok(named, 'names the main checkout');
  assert.ok(fs.existsSync(path.join(named, '.aegis', 'state.json')), `named checkout holds live state: ${named}`);
  assert.doesNotMatch(child.stderr, /run aegis init/);
});

test('handoff carries a deterministic Machinery section', (t) => {
  const dir = scratch(t);
  seedMachinery(dir);
  assert.equal(aegis(dir, ['checkpoint']).status, 0);
  assert.equal(aegis(dir, ['status', '--markdown']).status, 0);
  const handoff = path.join(dir, 'brain', 'handoff.md');
  const once = fs.readFileSync(handoff, 'utf8');
  assert.match(once, /## Machinery/);
  assert.match(once, /quarantine FROZEN: feature/);
  assert.match(once, /clean FAILING: feature \(cycle 1\/3/);
  assert.match(once, /demo: ui \[demo\.html\]/);
  assert.match(once, /memory: 1 active/);
  assert.equal(aegis(dir, ['status', '--markdown']).status, 0);
  assert.equal(fs.readFileSync(handoff, 'utf8'), once, 'machinery lines stay byte-deterministic');
});
