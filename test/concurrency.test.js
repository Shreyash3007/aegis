// v0.4.1: the metis-nda concurrent-exec lost-update bug + BlindFolio's
// validate-contracts monorepo push-blocker + config '-' deletion.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { scratch, gitIn, aegis, readState, CLI } from './helpers.js';

// THE bug: 10 concurrent `aegis exec` on one shared tree must record 10/10
// events (metis-nda measured 3/5 and 4/10 before the state lock).
test('10 concurrent exec calls: every event recorded, integrity holds', async (t) => {
  const dir = scratch(t);
  const run = (i) => new Promise((res) => {
    const p = spawn(process.execPath, [CLI, 'exec', '--', `true`], { cwd: dir, env: process.env });
    let err = '';
    p.stderr.on('data', (d) => { err += d; });
    p.on('close', (code) => res({ code, err, i }));
  });
  const results = await Promise.all([...Array(10)].map((_, i) => run(i)));
  for (const r of results) assert.equal(r.code, 0, `exec ${r.i}: ${r.err}`);
  const events = readState(dir).history.filter((h) => h.event?.startsWith('exec (exit 0): true'));
  assert.equal(events.length, 10, `expected 10/10 exec events, got ${events.length}`);
  const r = aegis(dir, ['resume']);
  assert.equal(r.status, 0, r.stderr);
});

// concurrent mixed mutations (chore) also land completely under the lock
test('8 concurrent chore mutations: 8/8 recorded', async (t) => {
  const dir = scratch(t);
  const run = (i) => new Promise((res) => {
    const p = spawn(process.execPath, [CLI, 'chore', `wave-${i}`], { cwd: dir, env: process.env });
    p.on('close', (code) => res(code));
  });
  const codes = await Promise.all([...Array(8)].map((_, i) => run(i)));
  assert.ok(codes.every((c) => c === 0));
  const events = readState(dir).history.filter((h) => h.event?.startsWith('chore: wave-'));
  assert.equal(events.length, 8);
});

test('a stale lock (dead pid) is stolen, never wedges the repo', (t) => {
  const dir = scratch(t);
  fs.writeFileSync(path.join(dir, '.aegis', 'state.json.lock'),
    JSON.stringify({ pid: 99999999, at: Date.now() }));
  const r = aegis(dir, ['chore', 'after-stale-lock']);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(!fs.existsSync(path.join(dir, '.aegis', 'state.json.lock')));
});

// v0.4.2: doc-style contracts get REAL gate semantics (contracts_doc mode):
// substantive + code-cited -> PASS; thin stub -> FAIL (exit 9, a real gate).
test('validate contracts with a thin markdown stub -> FAIL (a gate that fires)', (t) => {
  const dir = scratch(t);
  aegis(dir, ['config', 'set', 'contracts_path', 'plan']);
  fs.mkdirSync(path.join(dir, 'plan'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'plan', 'CONTRACTS.md'), '# Contracts\n');
  const r = aegis(dir, ['validate', 'contracts']);
  assert.equal(r.status, 9);
  assert.match(r.stderr, /too thin to gate/);
});

test('validate contracts with substantive code-cited docs -> PASS', (t) => {
  const dir = scratch(t);
  aegis(dir, ['config', 'set', 'contracts_path', 'plan']);
  fs.mkdirSync(path.join(dir, 'plan'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'plan', 'CONTRACTS.md'), [
    '# Contracts', '',
    'Transition legality is pinned by `src/lib/state.ts`.',
    'The API surface follows src/routes/auth.ts behavior.',
    'Every slice must keep `src/contracts/types.ts` stable.',
    'Errors use the exit-code table in src/cli.ts.',
    'Gates are recorded per docs in brain/quality/.',
    'Lane caps come from config lane_costs_mb.',
    'Rollback edges require a recorded reason.',
    'Checkpoints hash brain + state canonicalized.',
    'Resume refuses on any MODIFIED hashed file.',
    'Loop escalations always route to a human.',
    'Drift is reported, never auto-corrected.',
  ].join('\n') + '\n');
  const r = aegis(dir, ['validate', 'contracts']);
  assert.equal(r.status, 0, `stdout: ${r.stdout}\nstderr: ${r.stderr}`);
  assert.match(r.stdout, /doc contracts substantive \+ code-cited/);
});

test('pre-push hook passes with substantive doc contracts (thin ones SHOULD block)', (t) => {
  const dir = scratch(t);
  aegis(dir, ['config', 'set', 'contracts_path', 'plan']);
  fs.mkdirSync(path.join(dir, 'plan'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'plan', 'CONTRACTS.md'), [
    '# Contracts', '',
    'Transition legality pinned by `src/lib/state.ts`.',
    'API surface follows src/routes/auth.ts.',
    'Slices keep `src/contracts/types.ts` stable.',
    'Exit codes per src/cli.ts table.',
    'Gates recorded in brain/quality/.',
    'Lane caps from lane_costs_mb.',
    'Rollback edges need a reason.',
    'Checkpoints hash canonical state.',
    'Resume refuses MODIFIED files.',
    'Loops escalate to a human.',
  ].join('\n') + '\n');
  fs.writeFileSync(path.join(dir, 'f.txt'), 'x\n');
  gitIn(dir, ['add', '-A']);
  gitIn(dir, ['commit', '-q', '-m', 'x']);
  gitIn(dir, ['init', '-q', '--bare', 'remote.git']);
  gitIn(dir, ['remote', 'add', 'origin', 'remote.git']);
  const push = spawnSync('git', ['push', '-u', 'origin', 'main'], { cwd: dir, encoding: 'utf8' });
  assert.equal(push.status, 0, `stdout: ${push.stdout}\nstderr: ${push.stderr}`);
});

test("config set <optional> '-' removes the key instead of storing '-'", (t) => {
  const dir = scratch(t);
  aegis(dir, ['config', 'set', 'contracts_path', 'plan']);
  let cfg = JSON.parse(fs.readFileSync(path.join(dir, '.aegis', 'config.json'), 'utf8'));
  assert.equal(cfg.contracts_path, 'plan');
  const r = aegis(dir, ['config', 'set', 'contracts_path', '-']);
  assert.equal(r.status, 0, r.stderr);
  cfg = JSON.parse(fs.readFileSync(path.join(dir, '.aegis', 'config.json'), 'utf8'));
  assert.ok(!('contracts_path' in cfg), 'key removed, not set to "-"');
  // and validate contracts falls back to the default path wording
  assert.match(aegis(dir, ['validate', 'contracts']).stdout, /no src\/contracts/);
});
