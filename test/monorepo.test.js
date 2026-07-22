// v0.4.0: monorepo per-app state, contracts_path, exec wrapper, fix-done
// branch guardrail, concurrent-checkpoint safety (fork-agent wave substrate).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { scratch, gitIn, aegis, readState, CLI } from './helpers.js';

const appState = (dir, app) =>
  JSON.parse(fs.readFileSync(path.join(dir, '.aegis', 'apps', app, 'state.json'), 'utf8'));

// ---------- monorepo ----------

test('init --apps creates per-app states at 00a; root state untouched', (t) => {
  const dir = scratch(t, { init: false });
  const r = aegis(dir, ['init', '--yes', '--apps', 'web,api']);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(appState(dir, 'web').current_skill, '00a');
  assert.equal(appState(dir, 'api').current_skill, '00a');
  assert.equal(readState(dir).current_skill, '00a');
});

test('multi-app: status summarizes; mutations without --app die (exit 2)', (t) => {
  const dir = scratch(t, { init: false });
  aegis(dir, ['init', '--yes', '--apps', 'web,api']);
  const s = aegis(dir, ['status']);
  assert.equal(s.status, 0, s.stderr);
  assert.match(s.stdout, /web: 00a/);
  assert.match(s.stdout, /api: 00a/);
  assert.equal(aegis(dir, ['transition', '00b']).status, 2);
  assert.match(aegis(dir, ['transition', '00b']).stderr, /--app/);
});

test('per-app transition/gate are independent; detail via status --app', (t) => {
  const dir = scratch(t, { init: false });
  aegis(dir, ['init', '--yes', '--apps', 'web,api']);
  const tr = aegis(dir, ['transition', '00b', '--app', 'web']);
  assert.equal(tr.status, 0, tr.stderr);
  assert.equal(appState(dir, 'web').current_skill, '00b');
  assert.equal(appState(dir, 'api').current_skill, '00a', 'sibling app untouched');
  assert.equal(readState(dir).current_skill, '00a', 'root pipeline untouched');
  const g = aegis(dir, ['gate', 'PRD', '--approve', '--app', 'api'], { env: { AEGIS_HUMAN_TOKEN: '1' } });
  assert.equal(g.status, 0, g.stderr);
  assert.equal(appState(dir, 'api').gates.PRD.by, 'human-token');
  assert.ok(!appState(dir, 'web').gates.PRD, 'gates are per-app');
  const d = aegis(dir, ['status', '--app', 'web']);
  assert.match(d.stdout, /app: web \| state: 00b/);
});

test('config set apps post-init creates missing states; unknown --app refused', (t) => {
  const dir = scratch(t);
  const c = aegis(dir, ['config', 'set', 'apps', 'web,api']);
  assert.equal(c.status, 0, c.stderr);
  assert.equal(appState(dir, 'web').current_skill, '00a');
  assert.equal(aegis(dir, ['status', '--app', 'nope']).status, 2);
  assert.match(aegis(dir, ['status', '--app', 'nope']).stderr, /declared apps: web, api/);
});

test('checkpoint covers app states: tamper detected by resume (exit 6)', (t) => {
  const dir = scratch(t, { init: false });
  aegis(dir, ['init', '--yes', '--apps', 'web,api']);
  aegis(dir, ['checkpoint', '--quiet']);
  const p = path.join(dir, '.aegis', 'apps', 'web', 'state.json');
  const s = JSON.parse(fs.readFileSync(p, 'utf8'));
  s.current_skill = '08b'; // hand-edit: agent "skipped the funnel"
  fs.writeFileSync(p, JSON.stringify(s, null, 2) + '\n');
  const r = aegis(dir, ['resume']);
  assert.equal(r.status, 6);
  assert.match(r.stderr, /MODIFIED: .aegis\/apps\/web\/state.json/);
});

test('multi-app checkpoint/resume reports per-app positions', (t) => {
  const dir = scratch(t, { init: false });
  aegis(dir, ['init', '--yes', '--apps', 'web,api']);
  aegis(dir, ['transition', '00b', '--app', 'api']);
  aegis(dir, ['checkpoint', '--quiet']);
  const r = aegis(dir, ['resume']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /app web: 00a/);
  assert.match(r.stdout, /app api: 00b/);
});

// ---------- contracts_path ----------

test('contracts_path: N1 verification honors the configured location', (t) => {
  const dir = scratch(t);
  assert.equal(aegis(dir, ['config', 'set', 'contracts_path', 'plan/contracts']).status, 0);
  assert.equal(aegis(dir, ['contracts']).status, 4, 'nothing at plan/contracts yet');
  fs.mkdirSync(path.join(dir, 'plan', 'contracts'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'plan', 'contracts', 'api.md'), '# API contract\n');
  gitIn(dir, ['add', '-A']);
  gitIn(dir, ['commit', '-q', '--no-verify', '-m', 'contracts']);
  const r = aegis(dir, ['contracts']);
  assert.equal(r.status, 0, `stdout: ${r.stdout}\nstderr: ${r.stderr}`);
  assert.equal(readState(dir).contracts_merged, true);
});

test('contracts_path rejects absolute paths and .. traversal', (t) => {
  const dir = scratch(t);
  assert.equal(aegis(dir, ['config', 'set', 'contracts_path', '/etc']).status, 4);
  assert.equal(aegis(dir, ['config', 'set', 'contracts_path', '../x']).status, 4);
});

// ---------- exec ----------

test('exec records the run in history; exit code passes through', (t) => {
  const dir = scratch(t);
  const okr = aegis(dir, ['exec', '--', 'echo hello-wave']);
  assert.equal(okr.status, 0, okr.stderr);
  assert.match(okr.stdout, /hello-wave/);
  assert.match(okr.stdout, /exec recorded/);
  const fail = aegis(dir, ['exec', '--', 'exit 3']);
  assert.equal(fail.status, 3);
  assert.match(fail.stderr, /FAIL exec exit 3/);
  const events = readState(dir).history.map((h) => h.event).filter(Boolean);
  assert.ok(events.some((e) => e.includes('exec (exit 0): echo hello-wave')));
  assert.ok(events.some((e) => e.includes('exec (exit 3): exit 3')));
});

// ---------- fix branch guardrail ----------

test('fix done on a non-base branch prints the merge-oracle guardrail', (t) => {
  const dir = scratch(t);
  gitIn(dir, ['checkout', '-q', '-b', 'fix-branch']);
  aegis(dir, ['fix', 'start', 'branch fix']);
  const d = aegis(dir, ['fix', 'done']);
  assert.equal(d.status, 0, d.stderr);
  assert.match(d.stdout, /fast lane does not gate merges/);
  assert.match(d.stdout, /aegis merge check fix-branch/);
});

// ---------- concurrent-checkpoint safety (fork-agent wave substrate) ----------

test('5 parallel checkpoints on one shared tree: all succeed, resume verifies', async (t) => {
  const dir = scratch(t);
  const run = () => new Promise((res) => {
    const p = spawn(process.execPath, [CLI, 'checkpoint', '--quiet'], { cwd: dir, env: process.env });
    let err = '';
    p.stderr.on('data', (d) => { err += d; });
    p.on('close', (code) => res({ code, err }));
  });
  const results = await Promise.all([...Array(5)].map(run));
  for (const r of results) assert.equal(r.code, 0, r.err);
  const r = aegis(dir, ['resume']);
  assert.equal(r.status, 0, `stdout: ${r.stdout}\nstderr: ${r.stderr}`);
  assert.match(r.stdout, /integrity: VERIFIED/);
});
