// Claude Code host adapter (v0.11 R3a). The adapter writes exactly one
// managed block (a SessionStart hook group whose only member is the
// declaration's read-only `aegis status` binding) into the project's
// .claude/settings.json. This suite pins the security-audit S1 contract:
// structural block identity (never substring search), foreign preservation
// with model/provider/effort fields byte-identical across writes, link
// refusal before any mutation, a named backup created once before the first
// change, ambiguity refused instead of guessed, uninstall touching only the
// block, and no adapter-owned pipeline state, agent dispatch or model
// routing (the write diff is exactly the block - or a protected-field change
// fails the install). Refusal paths exit the CLI process, so they are
// exercised through spawned dist/cli.js runs; the install-form choice is a
// pure function and the missing-shell refusal is a child-process fixture.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT, scratch, aegis } from './helpers.js';
import * as adapter from '../dist/adapters/claude-code.js';
import { findDeclaration } from '../dist/hosts/declarations.js';

const DECL = () => findDeclaration('claude-code');
const argv = () => DECL().events.SessionStart.command.split(' ');
const expectedEntry = () => adapter.bindingFor(argv(), process.platform, adapter.pathHits()).entry;
const group = (entry) => ({ hooks: [entry] });
const settings = (dir) => path.join(dir, '.claude', 'settings.json');
const backup = (dir) => settings(dir) + '.aegis-backup';
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeSettings = (dir, obj) => {
  fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });
  fs.writeFileSync(settings(dir), JSON.stringify(obj, null, 2) + '\n');
};
const aegisEntries = (obj) =>
  ((obj.hooks || {}).SessionStart || []).flatMap((g) => g.hooks || []).filter((h) => h.command.startsWith('aegis'));

test('bindingFor: exec form for a real executable, shell form for Windows shims, honest warning when aegis is absent', () => {
  const a = ['aegis', 'status'];
  assert.deepEqual(adapter.bindingFor(a, 'linux', ['/usr/local/bin/aegis']), {
    entry: { type: 'command', command: 'aegis', args: ['status'] }, form: 'exec', warning: undefined,
  });
  assert.deepEqual(adapter.bindingFor(a, 'win32', ['C:\\nodejs\\aegis.exe']).entry,
    { type: 'command', command: 'aegis', args: ['status'] }, 'a real .exe is exec-spawnable');
  const shim = adapter.bindingFor(a, 'win32', ['C:\\nvm4w\\nodejs\\aegis', 'C:\\nvm4w\\nodejs\\aegis.cmd']);
  assert.deepEqual(shim.entry, { type: 'command', command: 'aegis status' }, 'a .cmd shim cannot be exec-spawned - documented shell form');
  assert.equal(shim.form, 'shell');
  assert.equal(shim.warning, undefined);
  for (const platform of ['win32', 'linux']) {
    const absent = adapter.bindingFor(a, platform, []);
    assert.match(absent.warning, /not found on PATH/, 'an absent CLI is stated honestly, never silently');
  }
  assert.deepEqual(adapter.bindingFor(['aegis', 'status', '--markdown'], 'linux', ['/x/aegis']).entry,
    { type: 'command', command: 'aegis', args: ['status', '--markdown'] }, 'the declaration argv passes through untouched');
});

test('install: clean install writes only the managed block and preserves foreign settings byte-for-byte', (t) => {
  const dir = scratch(t);
  const foreign = {
    model: 'opus',
    env: { ANTHROPIC_MODEL: 'claude-opus-4-6', CLAUDE_CODE_EFFORT: 'high' },
    permissions: { allow: ['Bash(ls:*)'] },
    hooks: {
      PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'my-gate' }] }],
      SessionStart: [{ hooks: [{ type: 'command', command: 'foreign-start' }] }],
    },
  };
  writeSettings(dir, foreign);
  const original = fs.readFileSync(settings(dir), 'utf8');
  const r = aegis(dir, ['host', 'install', 'claude-code']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /installed/);
  assert.match(r.stdout, /aegis-backup/, `the backup is named in the output: ${r.stdout}`);
  assert.equal(fs.readFileSync(backup(dir), 'utf8'), original, 'the backup holds the exact pre-install bytes');
  const post = readJson(settings(dir));
  assert.equal(JSON.stringify(post.model), JSON.stringify(foreign.model));
  assert.equal(JSON.stringify(post.env), JSON.stringify(foreign.env), 'model/provider/effort fields are byte-identical');
  assert.equal(JSON.stringify(post.permissions), JSON.stringify(foreign.permissions));
  assert.deepEqual(post.hooks.PreToolUse, foreign.hooks.PreToolUse, 'foreign hooks are untouched');
  const expected = {
    ...foreign,
    hooks: { ...foreign.hooks, SessionStart: [...foreign.hooks.SessionStart, group(expectedEntry())] },
  };
  assert.deepEqual(post, expected, 'the write diff is exactly the appended managed block');
});

test('install: repeat install is a no-op with no new backup and no byte churn', (t) => {
  const dir = scratch(t);
  writeSettings(dir, { model: 'opus', hooks: { SessionStart: [] } });
  const first = aegis(dir, ['host', 'install', 'claude-code']);
  assert.equal(first.status, 0, first.stderr);
  const bytes = fs.readFileSync(settings(dir), 'utf8');
  const backupBytes = fs.readFileSync(backup(dir), 'utf8');
  const second = aegis(dir, ['host', 'install', 'claude-code']);
  assert.equal(second.status, 0, second.stderr);
  assert.match(second.stdout, /already installed/);
  assert.equal(fs.readFileSync(settings(dir), 'utf8'), bytes, 'a canonical block is never rewritten');
  assert.equal(fs.readFileSync(backup(dir), 'utf8'), backupBytes, 'the backup is taken once, before the first change');
  const artifacts = fs.readdirSync(path.join(dir, '.claude'));
  assert.equal(artifacts.filter((f) => f.includes('aegis-backup')).length, 1, 'exactly one backup exists');
});

test('install: fresh project creates .claude/settings.json with only the managed block and no backup', (t) => {
  const dir = scratch(t);
  const r = aegis(dir, ['host', 'install', 'claude-code']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /created/);
  assert.ok(!fs.existsSync(backup(dir)), 'nothing to back up in a fresh project');
  assert.deepEqual(readJson(settings(dir)), { hooks: { SessionStart: [group(expectedEntry())] } });
});

test('refusals: linked targets refuse before any write (directory junction and file symlink)', (t) => {
  const dir = scratch(t);
  const real = path.join(dir, 'elsewhere');
  fs.mkdirSync(real);
  fs.writeFileSync(path.join(real, 'settings.json'), '{"model":"x"}\n');
  fs.symlinkSync(real, path.join(dir, '.claude'), 'junction');
  const r = aegis(dir, ['host', 'install', 'claude-code']);
  assert.equal(r.status, 4, `a linked .claude must refuse (got ${r.status}): ${r.stderr}`);
  assert.match(r.stderr, /link/);
  assert.equal(fs.readFileSync(path.join(real, 'settings.json'), 'utf8'), '{"model":"x"}\n', 'the link target is untouched');
  assert.ok(!fs.existsSync(path.join(real, 'settings.json.aegis-backup')), 'no backup is written through a link');
  const dir2 = scratch(t);
  fs.mkdirSync(path.join(dir2, '.claude'));
  const outside = path.join(dir2, 'outside.json');
  fs.writeFileSync(outside, '{"model":"x"}\n');
  try {
    fs.symlinkSync(outside, settings(dir2), 'file');
  } catch {
    t.diagnostic('file symlinks need Windows developer mode - the directory-junction case above covers the link refusal');
    return;
  }
  const r2 = aegis(dir2, ['host', 'install', 'claude-code']);
  assert.equal(r2.status, 4, `a linked settings.json must refuse: ${r2.stderr}`);
  assert.match(r2.stderr, /link/);
  assert.equal(fs.readFileSync(outside, 'utf8'), '{"model":"x"}\n', 'the link target is untouched');
  assert.ok(!fs.existsSync(outside + '.aegis-backup'), 'no backup is written through a link');
});

test('refusals: ambiguity refuses instead of guessing (two generations, pre-existing backup, stray entry)', (t) => {
  const e1 = { type: 'command', command: 'aegis status' };
  const e2 = { type: 'command', command: 'aegis', args: ['status'] };
  const cases = [
    {
      why: 'two managed generations',
      setup: (dir) => writeSettings(dir, { hooks: { SessionStart: [group(e1), group(e2)] } }),
      pattern: /multiple|ambiguous/,
    },
    {
      why: 'a pre-existing backup with no managed block',
      setup: (dir) => { writeSettings(dir, { model: 'opus' }); fs.writeFileSync(backup(dir), 'legacy bytes\n'); },
      pattern: /backup/,
    },
    {
      why: 'a canonical entry outside the managed block',
      setup: (dir) => writeSettings(dir, { hooks: { SessionStart: [{ matcher: 'startup', hooks: [e2] }] } }),
      pattern: /outside the managed block/,
    },
  ];
  for (const c of cases) {
    const dir = scratch(t);
    c.setup(dir);
    const before = fs.readFileSync(settings(dir), 'utf8');
    const r = aegis(dir, ['host', 'install', 'claude-code']);
    assert.equal(r.status, 4, `${c.why}: ${r.stderr}`);
    assert.match(r.stderr, c.pattern, c.why);
    assert.equal(fs.readFileSync(settings(dir), 'utf8'), before, `${c.why}: nothing was written`);
  }
});

test('refusals: a foreign structure at the target path refuses honestly (file named .claude, directory named settings.json)', (t) => {
  const dir = scratch(t);
  fs.writeFileSync(path.join(dir, '.claude'), 'not a directory\n');
  const r = aegis(dir, ['host', 'install', 'claude-code']);
  assert.equal(r.status, 4, r.stderr);
  assert.match(r.stderr, /not a directory/);
  assert.equal(fs.readFileSync(path.join(dir, '.claude'), 'utf8'), 'not a directory\n');
  const dir2 = scratch(t);
  fs.mkdirSync(path.join(dir2, '.claude', 'settings.json'), { recursive: true });
  const r2 = aegis(dir2, ['host', 'install', 'claude-code']);
  assert.equal(r2.status, 4, r2.stderr);
  assert.match(r2.stderr, /not a regular file/);
  assert.ok(fs.statSync(settings(dir2)).isDirectory(), 'the foreign directory is untouched');
});

test('denied permissions: the outcome matches the platform real write semantics honestly', (t) => {
  const dir = scratch(t);
  writeSettings(dir, { model: 'opus' });
  assert.equal(aegis(dir, ['host', 'install', 'claude-code']).status, 0);
  fs.chmodSync(settings(dir), 0o444);
  const r = aegis(dir, ['host', 'uninstall', 'claude-code']);
  fs.chmodSync(settings(dir), 0o666);
  const post = readJson(settings(dir));
  const installed = aegisEntries(post).length;
  if (process.platform === 'win32') {
    assert.notEqual(r.status, 0, 'a read-only target refuses the atomic replace on Windows');
    assert.match(r.stderr, /unchanged/);
    assert.match(r.stderr, /backup/, `the failure names the backup: ${r.stderr}`);
    assert.equal(installed, 1, 'the managed block is still installed - nothing was half-removed');
  } else {
    assert.equal(r.status, 0, r.stderr);
    assert.equal(installed, 0, 'a rename within a writable directory succeeds on POSIX');
  }
});

test('uninstall: removes only the managed block, restores foreign bytes, prunes emptied containers, keeps the backup', (t) => {
  const dir = scratch(t);
  const foreign = {
    model: 'opus',
    env: { ANTHROPIC_MODEL: 'claude-opus-4-6' },
    hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'foreign-start' }] }] },
  };
  writeSettings(dir, foreign);
  const original = fs.readFileSync(settings(dir), 'utf8');
  assert.equal(aegis(dir, ['host', 'install', 'claude-code']).status, 0);
  const r = aegis(dir, ['host', 'uninstall', 'claude-code']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /removed/);
  assert.match(r.stdout, /backup kept/);
  assert.equal(fs.readFileSync(settings(dir), 'utf8'), original, 'uninstall restores the file byte-for-byte');
  assert.ok(fs.existsSync(backup(dir)), 'the named backup is kept for manual recovery');
  const fresh = scratch(t);
  assert.equal(aegis(fresh, ['host', 'install', 'claude-code']).status, 0);
  assert.equal(aegis(fresh, ['host', 'uninstall', 'claude-code']).status, 0);
  assert.ok(fs.existsSync(settings(fresh)), 'the file remains, never deleted');
  assert.deepEqual(readJson(settings(fresh)), {}, 'emptied containers are pruned');
  const again = aegis(dir, ['host', 'uninstall', 'claude-code']);
  assert.equal(again.status, 0, again.stderr);
  assert.match(again.stdout, /nothing to remove/);
});

test('verify: reports the binding honestly (present exit 0, absent exit 9, adapterless and unknown ids exit 2)', (t) => {
  const dir = scratch(t);
  const absent = aegis(dir, ['host', 'verify', 'claude-code']);
  assert.equal(absent.status, 9, `absent: ${absent.stdout}${absent.stderr}`);
  assert.match(absent.stderr, /not present/);
  assert.equal(aegis(dir, ['host', 'install', 'claude-code']).status, 0);
  const present = aegis(dir, ['host', 'verify', 'claude-code']);
  assert.equal(present.status, 0, present.stderr);
  assert.match(present.stdout, /present/);
  const adapterless = aegis(dir, ['host', 'install', 'cursor']);
  assert.equal(adapterless.status, 2);
  assert.match(adapterless.stderr, /no adapter/);
  const unknown = aegis(dir, ['host', 'verify', 'not-a-host']);
  assert.equal(unknown.status, 2);
  assert.match(unknown.stderr, /unknown host/);
  const usage = aegis(dir, ['host', 'install']);
  assert.equal(usage.status, 2);
  assert.match(usage.stderr, /usage/);
});

test('missing-shell: a manual-guidance declaration refuses install with an honest message and writes nothing', (t) => {
  const manual = JSON.parse(JSON.stringify(DECL()));
  manual.status = 'manual-guidance';
  manual.events = {};
  const dir = scratch(t);
  const child = spawnSync(process.execPath, ['-e',
    'import(process.env.AEGIS_ADAPTER).then((m) => m.installAdapter(JSON.parse(process.env.AEGIS_DECL), process.env.AEGIS_DIR));',
  ], {
    cwd: dir,
    encoding: 'utf8',
    env: {
      ...process.env,
      AEGIS_ADAPTER: pathToFileURL(path.join(REPO_ROOT, 'dist', 'adapters', 'claude-code.js')).href,
      AEGIS_DECL: JSON.stringify(manual),
      AEGIS_DIR: dir,
    },
  });
  assert.equal(child.status, 4, `stderr: ${child.stderr}`);
  assert.match(child.stderr, /no supported events/);
  assert.ok(!fs.existsSync(path.join(dir, '.claude')), 'nothing was written');
});
