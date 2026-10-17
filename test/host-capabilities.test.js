// Host capability declarations (v0.11 R2). The shipped set is data built
// from each host's official documentation; this suite pins the contract
// invariants: exactly the contract fields; every supported event is ONE
// aegis argv (no shell interpolation) that names an existing CLI command;
// expected-but-unsupported events are stated (silence is never support); a
// host without the needed mechanism selects manual guidance - never a
// scheduler, daemon or fallback; and nothing claims 'verified' without a
// recorded real-host smoke. CLI assertions spawn the built dist/cli.js;
// module assertions read the built dist modules.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { scratch, aegis } from './helpers.js';
import * as contracts from '../dist/contracts/hosts.js';
import * as decl from '../dist/hosts/declarations.js';
import { COMMANDS } from '../dist/lib/commands.js';

const SHIPPED_IDS = ['claude-code', 'opencode', 'cursor'];
// The full contract field set - a declaration cannot smuggle in extra knobs
// (a scheduler, daemon or fallback model is not a declaration field).
const CONTRACT_KEYS = [
  'config_files', 'config_scope', 'display_name', 'docs', 'events', 'id',
  'install_strategy', 'limitations', 'schema_version', 'status',
  'unsupported_events', 'verification', 'verified_with',
];

const shipped = () => decl.HOST_DECLARATIONS;

test('declarations: exactly claude-code / opencode / cursor with the contract fields', () => {
  const set = shipped();
  assert.deepEqual(set.map((d) => d.id), SHIPPED_IDS);
  for (const d of set) {
    assert.equal(d.schema_version, contracts.HOST_SCHEMA_VERSION, `${d.id}: schema_version`);
    assert.deepEqual(Object.keys(d).sort(), CONTRACT_KEYS, `${d.id}: exactly the contract fields`);
    assert.ok(d.display_name.length > 0, `${d.id}: display_name`);
  }
});

test('declarations: every shipped declaration passes declarationProblems', () => {
  for (const d of shipped())
    assert.deepEqual(decl.declarationProblems(d), [], `${d.id} must be problem-free`);
});

test('declarationProblems: refuses dishonest claims (verified without smoke, manual-guidance with events, shell interpolation)', () => {
  const check = (mutate) => {
    const d = JSON.parse(JSON.stringify(shipped()[0]));
    mutate(d);
    return decl.declarationProblems(d);
  };
  const cases = [
    [(d) => { d.status = 'verified'; }, /verified|wishful/, 'no verified claim without a recorded smoke'],
    [(d) => { d.verified_with = [{ host_version: '2.1.269', date: '2026-10-18', event: 'SessionStart', evidence: 'log' }]; }, /verified/, 'no smoke records under a fixture-only status'],
    [(d) => { d.status = 'manual-guidance'; }, /manual-guidance/, 'a host without the mechanism claims no events (never a scheduler, daemon or fallback)'],
    [(d) => { d.events.SessionStart.command = 'aegis status; rm -rf /'; }, /argv/, 'shell chaining is refused'],
    [(d) => { d.events.SessionStart.command = 'aegis status | tee log'; }, /argv/, 'pipes are refused'],
    [(d) => { d.events.SessionStart.command = 'other-tool status'; }, /argv/, 'only an aegis argv is allowed'],
    [(d) => { d.events.SessionStart.event = 'WrongName'; }, /official docs/, 'the binding key must be the documented event name'],
    [(d) => { d.unsupported_events = []; }, /unsupported|silence/, 'unsupported events are stated explicitly'],
    [(d) => { d.unsupported_events.push('SessionStart'); }, /both/, 'an event cannot be both supported and unsupported'],
    [(d) => { d.docs[0].url = 'http://example.com/hooks'; }, /https/, 'citations are https pages'],
    [(d) => { d.schema_version = 99; }, /schema_version/, 'schema drift is refused'],
    [(d) => { d.limitations = []; }, /limitation/, 'honest limitations are required'],
    [(d) => { d.config_files = ['../outside.json']; }, /relative/, 'config writes stay project-relative'],
  ];
  for (const [mutate, pattern, why] of cases) {
    const got = check(mutate);
    assert.ok(got.some((m) => pattern.test(m)), `${why} (got: ${got.join(' | ') || 'no problems'})`);
  }
});

test('bindings: each supported event is one aegis argv that names an existing CLI command', () => {
  for (const d of shipped()) {
    const events = Object.entries(d.events);
    assert.ok(events.length > 0, `${d.id}: at least one supported event is declared`);
    for (const [name, b] of events) {
      assert.equal(b.event, name, `${d.id}: binding key is the event name`);
      assert.match(b.command, /^aegis( [a-z][a-z0-9-]*){1,3}$/, `${d.id}/${name}: one aegis argv, no shell interpolation, one invocation`);
      assert.ok(COMMANDS.includes(b.command.split(' ')[1]), `${d.id}/${name}: '${b.command}' invokes an existing CLI command`);
      assert.ok(['none', 'stdin-json'].includes(b.payload), `${d.id}/${name}: payload is none or stdin-json`);
    }
  }
});

test('unsupported events: explicitly stated per host and disjoint from supported events', () => {
  const expected = { 'claude-code': 'PreToolUse', opencode: 'execute.before', cursor: 'preToolUse' };
  for (const d of shipped()) {
    assert.ok(d.unsupported_events.length > 0, `${d.id}: expected-but-unsupported events are stated (silence is never support)`);
    for (const e of d.unsupported_events)
      assert.ok(!(e in d.events), `${d.id}: '${e}' cannot be both supported and unsupported`);
    assert.ok(d.unsupported_events.includes(expected[d.id]), `${d.id}: names ${expected[d.id]} as deliberately unsupported (no tool gating / no prompt rewriting)`);
  }
});

test('docs citations: official https pages with retrieval dates', () => {
  const expectedHost = { 'claude-code': 'code.claude.com', opencode: 'opencode.ai', cursor: 'cursor.com' };
  for (const d of shipped()) {
    assert.ok(d.docs.length > 0, `${d.id}: at least one official-doc citation`);
    for (const c of d.docs) {
      assert.equal(new URL(c.url).protocol, 'https:', `${d.id}: ${c.url}`);
      assert.match(c.retrieved, /^\d{4}-\d{2}-\d{2}$/, `${d.id}: ${c.url} retrieval date`);
    }
    assert.ok(d.docs.some((c) => new URL(c.url).hostname.endsWith(expectedHost[d.id])), `${d.id}: cites ${expectedHost[d.id]}`);
  }
});

test('evidence honesty: fixture-only until a real versioned-host smoke is recorded', () => {
  for (const d of shipped()) {
    assert.equal(d.status, 'fixture-only', `${d.id}: no real-host smoke yet - R3 upgrades with recorded evidence`);
    assert.deepEqual(d.verified_with, [], `${d.id}: verified_with stays empty without a smoke`);
  }
});

test('host CLI: list reads the shipped declarations', (t) => {
  const dir = scratch(t);
  const r = aegis(dir, ['host', 'list']);
  assert.equal(r.status, 0, r.stderr);
  const lines = r.stdout.trim().split('\n');
  for (const d of shipped())
    assert.ok(lines.some((l) => l.startsWith(`${d.id}\t${d.status}\t`)), `${d.id} listed with status ${d.status}: ${r.stdout}`);
});

test('host CLI: inspect prints each shipped declaration as JSON', (t) => {
  const dir = scratch(t);
  for (const d of shipped()) {
    const r = aegis(dir, ['host', 'inspect', d.id]);
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(JSON.parse(r.stdout), d, `${d.id}: inspect is the shipped declaration`);
  }
});

test('install fixtures: verification commands find the aegis binding and report its absence', (t) => {
  const runCheck = (dir, command) => spawnSync(command, { shell: true, cwd: dir, encoding: 'utf8' });
  const byId = (id) => decl.findDeclaration(id);

  // claude-code: one aegis command handler under hooks.SessionStart.
  {
    const d = byId('claude-code');
    const clean = scratch(t, { init: false });
    fs.mkdirSync(path.join(clean, '.claude'), { recursive: true });
    fs.writeFileSync(path.join(clean, '.claude', 'settings.json'), JSON.stringify({
      model: 'opus',
      hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'aegis', args: ['status'] }] }] },
    }));
    const ok = runCheck(clean, d.verification.command);
    assert.equal((ok.stdout || '').trim(), '1', ok.stderr);

    const foreign = scratch(t, { init: false });
    fs.mkdirSync(path.join(foreign, '.claude'), { recursive: true });
    fs.writeFileSync(path.join(foreign, '.claude', 'settings.json'), JSON.stringify({
      hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'other-tool', args: ['check'] }] }] },
    }));
    assert.equal((runCheck(foreign, d.verification.command).stdout || '').trim(), '0', 'foreign hooks are not counted');

    const absent = scratch(t, { init: false });
    assert.notEqual(runCheck(absent, d.verification.command).status, 0, 'an absent settings file is a failed check, not a silent pass');
  }

  // cursor: one aegis entry next to a foreign entry in .cursor/hooks.json.
  {
    const d = byId('cursor');
    const clean = scratch(t, { init: false });
    fs.mkdirSync(path.join(clean, '.cursor'), { recursive: true });
    fs.writeFileSync(path.join(clean, '.cursor', 'hooks.json'), JSON.stringify({
      version: 1,
      hooks: { sessionStart: [{ command: 'aegis status' }, { command: 'other-tool start' }] },
    }));
    const ok = runCheck(clean, d.verification.command);
    assert.equal((ok.stdout || '').trim(), '1', ok.stderr);

    const foreign = scratch(t, { init: false });
    fs.mkdirSync(path.join(foreign, '.cursor'), { recursive: true });
    fs.writeFileSync(path.join(foreign, '.cursor', 'hooks.json'), JSON.stringify({
      version: 1,
      hooks: { sessionStart: [{ command: 'other-tool start' }] },
    }));
    assert.equal((runCheck(foreign, d.verification.command).stdout || '').trim(), '0', 'foreign sessionStart entries are not counted');

    const absent = scratch(t, { init: false });
    assert.notEqual(runCheck(absent, d.verification.command).status, 0, 'an absent hooks file is a failed check');
  }

  // opencode: the dedicated plugin file, present or absent.
  {
    const d = byId('opencode');
    const clean = scratch(t, { init: false });
    fs.mkdirSync(path.join(clean, '.opencode', 'plugins'), { recursive: true });
    fs.writeFileSync(path.join(clean, '.opencode', 'plugins', 'aegis.ts'), [
      '// Aegis OpenCode session-context plugin (installed by the Aegis host adapter).',
      'import { Plugin } from "@opencode/plugin"',
      'export default Plugin.define({ id: "aegis", async setup(ctx) { /* spawns aegis status on the first context build */ } })',
    ].join('\n'));
    const ok = runCheck(clean, d.verification.command);
    assert.equal((ok.stdout || '').trim(), '1', ok.stderr);

    const absent = scratch(t, { init: false });
    assert.equal((runCheck(absent, d.verification.command).stdout || '').trim(), '0', 'an absent plugin file is reported honestly as 0');
  }
});
