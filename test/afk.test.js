// v0.5.1 AFK-autonomy + invisible-failure-mode items:
// hooks ghost-binary version tripwire, aegis wave prompt block,
// exit-5 recovery hint, doctor attention report.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { scratch, gitIn, aegis, readState, writeState, CLI } from './helpers.js';

const GIT_IDENTITY = ['-c', 'user.email=aegis-test@example.com', '-c', 'user.name=aegis-test'];

// 1a: hooks bake the CLI version; a mismatched resolved CLI warns but NEVER blocks
test('hooks bake a version stamp; version mismatch warns but commit still lands', (t) => {
  const dir = scratch(t);
  const hook = fs.readFileSync(path.join(dir, '.git', 'hooks', 'pre-commit'), 'utf8');
  assert.match(hook, /hooks were baked for v\d+\.\d+\.\d+/);
  // simulate the ghost binary: corrupt the baked version EVERYWHERE it
  // appears (the != comparison AND the echo text)
  const baked = (hook.match(/baked for v(\d+\.\d+\.\d+)/) || [])[1];
  assert.ok(baked, 'hook carries a baked version');
  fs.writeFileSync(path.join(dir, '.git', 'hooks', 'pre-commit'),
    hook.split(baked).join('0.0.0-ghost'));
  fs.writeFileSync(path.join(dir, 'f.txt'), 'x\n');
  gitIn(dir, ['add', '-A']);
  const c = spawnSync('git', [...GIT_IDENTITY, 'commit', '-m', 'x'], { cwd: dir, encoding: 'utf8' });
  assert.equal(c.status, 0, `stdout: ${c.stdout}\nstderr: ${c.stderr}`);
  assert.match(`${c.stdout}\n${c.stderr}`, /ghost binary/);
  assert.match(`${c.stdout}\n${c.stderr}`, /repair: aegis hooks \(re-resolve\) or aegis update/);
});

// 1b: aegis wave emits a deterministic, paste-able executor prompt block
test('aegis wave writes brain/wave-prompt.md: deterministic, has the rules', (t) => {
  const dir = scratch(t);
  const r = aegis(dir, ['wave']);
  assert.equal(r.status, 0, r.stderr);
  const p = path.join(dir, 'brain', 'wave-prompt.md');
  assert.match(fs.readFileSync(p, 'utf8'), /aegis exec -- <your command>/);
  assert.match(fs.readFileSync(p, 'utf8'), /NEVER hand-edit .aegis\//);
  assert.match(fs.readFileSync(p, 'utf8'), /Current pipeline position: 00a/);
  assert.ok(!/\d{4}-\d{2}-\d{2}T/.test(fs.readFileSync(p, 'utf8')), 'no timestamps (A1.2)');
  aegis(dir, ['wave']);
  assert.equal(fs.readFileSync(p, 'utf8'), fs.readFileSync(p, 'utf8'));
  // multi-app: the --app rule appears
  aegis(dir, ['config', 'set', 'apps', 'web,api']);
  aegis(dir, ['wave']);
  assert.match(fs.readFileSync(p, 'utf8'), /apps: web, api/);
});

// 2a: exit-5 escalation names the exact recovery command
test('loop escalation (exit 5) prints the loops reset recovery command', (t) => {
  const dir = scratch(t);
  // drive the 01b -> 01a rollback edge to the loop limit (max_loop 3)
  aegis(dir, ['transition', '00b']);
  aegis(dir, ['transition', '01a']);
  aegis(dir, ['gate', 'PRD', '--approve'], { env: { AEGIS_HUMAN_TOKEN: '1' } });
  aegis(dir, ['transition', '01b']);
  let r;
  for (let i = 0; i < 3; i++) {
    r = aegis(dir, ['transition', '01a', '--reason', 'scope gap']);
    if (r.status === 0) aegis(dir, ['transition', '01b']);
  }
  r = aegis(dir, ['transition', '01a', '--reason', 'scope gap']);
  assert.equal(r.status, 5);
  assert.match(r.stderr, /ESCALATION/);
  assert.match(r.stderr, /aegis loops reset --reason/);
});

// 2b: doctor attention report surfaces what parks an AFK run
test('doctor attention: open fix, loop counters, OPEN gates are surfaced', (t) => {
  const dir = scratch(t);
  aegis(dir, ['transition', '00b']);
  aegis(dir, ['transition', '01a']); // now PRD gate blocks 01a->01b
  aegis(dir, ['fix', 'start', 'half-done patch']);
  const s = readState(dir);
  s.loop_counters['01b->01a'] = 2; // approaching the limit
  writeState(dir, s);
  const d = aegis(dir, ['doctor']);
  assert.equal(d.status, 0, d.stderr);
  assert.match(d.stdout, /attention: fix OPEN: "half-done patch"/);
  assert.match(d.stdout, /attention: loop counter 01b->01a at 2\/3/);
  assert.match(d.stdout, /attention: gate PRD OPEN blocks 01a->01b/);
});
