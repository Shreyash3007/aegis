// Cursor host adapter (v0.11 R3c). The adapter installs exactly one managed
// entry in the project's .cursor/hooks.json: a sessionStart hook whose only
// member is the declaration's read-only `aegis status` binding, in the
// documented Cursor hooks shape (version 1; hooks.sessionStart entries with a
// `command` shell string run from the project root). The entry's identity is
// structural - an exact object whose only key is `command` and whose value is
// the declaration argv - never a substring search. Security posture, in
// order: links refuse (lstat before any mutation); a stray or duplicated
// aegis entry refuses instead of duplicating; the target is backed up once,
// named, before the first change; ambiguity (a pre-existing backup without a
// managed entry) refuses; install and uninstall touch only the managed entry,
// and every write re-reads the file, restoring the pre-write bytes if any
// model/provider/effort field changed or anything outside the managed entry
// moved. Adapters never own pipeline state, dispatch agents or add model
// routing - the installed command is the declaration's argv, nothing else.
// Cursor is absent locally, so the capability status stays `fixture-only`;
// this suite pins fixture behavior, not a live host integration - the
// advertised scope (accept fixture-only / test elsewhere / drop) is an owner
// decision recorded in the slice evidence, and nothing here upgrades the
// declaration (that needs a real versioned-host smoke).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT, scratch, aegis } from './helpers.js';
import * as adapter from '../dist/adapters/cursor.js';
import { findDeclaration } from '../dist/hosts/declarations.js';

const DECL = () => findDeclaration('cursor');
const argv = () => DECL().events.sessionStart.command.split(' ');
const hooksPath = (dir) => path.join(dir, '.cursor', 'hooks.json');
const backupPath = (dir) => hooksPath(dir) + '.aegis-backup';
const read = (dir) => JSON.parse(fs.readFileSync(hooksPath(dir), 'utf8'));
const writeHooks = (dir, content) => {
  fs.mkdirSync(path.join(dir, '.cursor'), { recursive: true });
  fs.writeFileSync(hooksPath(dir), content);
};

test('entry content: the canonical managed entry is the documented shape - version 1 on fresh files, command as the only key', (t) => {
  assert.deepEqual(adapter.cursorEntry(argv()), { command: 'aegis status' });
  assert.deepEqual(Object.keys(adapter.cursorEntry(argv())), ['command'],
    'ours is exactly the documented command field - extra knobs are foreign');
  const dir = scratch(t);
  const r = aegis(dir, ['host', 'install', 'cursor']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /created .*hooks\.json/);
  const obj = read(dir);
  assert.equal(obj.version, 1, 'the documented schema version is written on a fresh file');
  assert.deepEqual(obj.hooks.sessionStart, [{ command: 'aegis status' }]);
  assert.ok(!fs.existsSync(backupPath(dir)), 'nothing to back up in a fresh project');
});

test('install: foreign entries are preserved byte-for-byte and a named backup is made before the first change', (t) => {
  const dir = scratch(t);
  const foreign = JSON.stringify({
    version: 1,
    model: 'keep-me',
    hooks: {
      sessionStart: [{ command: 'echo hi' }],
      afterFileEdit: [{ command: '.cursor/hooks/format.sh' }],
    },
  }, null, 2) + '\n';
  writeHooks(dir, foreign);
  const r = aegis(dir, ['host', 'install', 'cursor']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /backup/);
  assert.equal(fs.readFileSync(backupPath(dir), 'utf8'), foreign, 'the backup is the pre-change bytes, named');
  const obj = read(dir);
  assert.equal(obj.model, 'keep-me', 'top-level foreign content is untouched');
  assert.deepEqual(obj.hooks.afterFileEdit, [{ command: '.cursor/hooks/format.sh' }], 'foreign events are untouched');
  assert.deepEqual(obj.hooks.sessionStart, [{ command: 'echo hi' }, { command: 'aegis status' }],
    'our entry is appended; foreign sessionStart entries stay');
  const stripped = { ...obj, hooks: { ...obj.hooks, sessionStart: obj.hooks.sessionStart.filter((e) => e.command !== 'aegis status') } };
  assert.equal(JSON.stringify(stripped, null, 2) + '\n', foreign, 'format and foreign bytes outside the managed entry survive');
});

test('install: repeat install is a no-op with no byte churn, including CRLF and minified checkouts', (t) => {
  const dir = scratch(t);
  assert.equal(aegis(dir, ['host', 'install', 'cursor']).status, 0);
  const bytes = fs.readFileSync(hooksPath(dir), 'utf8');
  const second = aegis(dir, ['host', 'install', 'cursor']);
  assert.equal(second.status, 0, second.stderr);
  assert.match(second.stdout, /already installed/);
  assert.equal(fs.readFileSync(hooksPath(dir), 'utf8'), bytes, 'a canonical entry is never rewritten');
  fs.writeFileSync(hooksPath(dir), bytes.replace(/\n/g, '\r\n'));
  const crlfBytes = fs.readFileSync(hooksPath(dir), 'utf8');
  const third = aegis(dir, ['host', 'install', 'cursor']);
  assert.equal(third.status, 0, third.stderr);
  assert.match(third.stdout, /already installed/, 'line endings are not content');
  assert.equal(fs.readFileSync(hooksPath(dir), 'utf8'), crlfBytes, 'no byte churn for a CRLF checkout');
  const min = scratch(t);
  writeHooks(min, '{"version":1,"hooks":{"afterFileEdit":[{"command":"x.sh"}]}}');
  const ins = aegis(min, ['host', 'install', 'cursor']);
  assert.equal(ins.status, 0, ins.stderr);
  const text = fs.readFileSync(hooksPath(min), 'utf8');
  assert.ok(!text.includes('\n'), 'a minified file stays minified');
  assert.deepEqual(JSON.parse(text).hooks.sessionStart, [{ command: 'aegis status' }]);
});

test('refusals: a stray or duplicated aegis entry refuses instead of duplicating', (t) => {
  const cases = [
    { why: 'the managed entry shape under a different event', body: { version: 1, hooks: { afterFileEdit: [{ command: 'aegis status' }] } } },
    { why: 'an aegis entry with extra knobs (foreign, not ours)', body: { version: 1, hooks: { sessionStart: [{ command: 'aegis status', timeout: 30 }] } } },
    { why: 'two canonical managed entries', body: { version: 1, hooks: { sessionStart: [{ command: 'aegis status' }, { command: 'aegis status' }] } } },
  ];
  for (const c of cases) {
    const dir = scratch(t);
    const src = JSON.stringify(c.body, null, 2) + '\n';
    writeHooks(dir, src);
    const r = aegis(dir, ['host', 'install', 'cursor']);
    assert.equal(r.status, 4, `${c.why}: ${r.stdout}${r.stderr}`);
    assert.match(r.stderr, /refuses to guess/, c.why);
    assert.equal(fs.readFileSync(hooksPath(dir), 'utf8'), src, `${c.why}: the file is untouched`);
    assert.ok(!fs.existsSync(backupPath(dir)), `${c.why}: no backup is made of ambiguity`);
  }
});

test('refusals: malformed hooks.json refuses instead of guessing (invalid JSON, non-object, hooks not an object, sessionStart not an array)', (t) => {
  const cases = [
    { src: 'not json\n', pattern: /not valid JSON/ },
    { src: '[]\n', pattern: /not a JSON object/ },
    { src: '{"version":1,"hooks":[]}\n', pattern: /'hooks' is not an object/ },
    { src: '{"version":1,"hooks":{"sessionStart":{"command":"aegis status"}}}\n', pattern: /not an array/ },
  ];
  for (const c of cases) {
    const dir = scratch(t);
    writeHooks(dir, c.src);
    const r = aegis(dir, ['host', 'install', 'cursor']);
    assert.equal(r.status, 4, `${c.src.trim()}: ${r.stdout}${r.stderr}`);
    assert.match(r.stderr, c.pattern);
    assert.equal(fs.readFileSync(hooksPath(dir), 'utf8'), c.src, 'the file is untouched');
  }
});

test('refusals: linked targets refuse before any write (directory junction and file symlink)', (t) => {
  const dir = scratch(t);
  const real = path.join(dir, 'elsewhere');
  fs.mkdirSync(real);
  fs.writeFileSync(path.join(real, 'hooks.json'), '{}\n');
  fs.symlinkSync(real, path.join(dir, '.cursor'), 'junction');
  const r = aegis(dir, ['host', 'install', 'cursor']);
  assert.equal(r.status, 4, `a linked .cursor must refuse (got ${r.status}): ${r.stderr}`);
  assert.match(r.stderr, /link/);
  assert.equal(fs.readFileSync(path.join(real, 'hooks.json'), 'utf8'), '{}\n', 'the link target is untouched');
  const dir2 = scratch(t);
  fs.mkdirSync(path.join(dir2, '.cursor'), { recursive: true });
  const outside = path.join(dir2, 'outside.json');
  fs.writeFileSync(outside, '{}\n');
  try {
    fs.symlinkSync(outside, hooksPath(dir2), 'file');
  } catch {
    t.diagnostic('file symlinks need Windows developer mode - the directory-junction case above covers the link refusal');
    return;
  }
  const r2 = aegis(dir2, ['host', 'install', 'cursor']);
  assert.equal(r2.status, 4, `a linked hooks.json must refuse: ${r2.stderr}`);
  assert.match(r2.stderr, /link/);
  assert.equal(fs.readFileSync(outside, 'utf8'), '{}\n', 'the link target is untouched');
});

test('refusals: ambiguity refuses instead of guessing (backup without managed entry, file named .cursor, directory named hooks.json)', (t) => {
  const cases = [
    {
      why: 'a pre-existing backup with no managed entry',
      setup: (dir) => { writeHooks(dir, '{"version":1,"hooks":{}}\n'); fs.writeFileSync(backupPath(dir), 'legacy bytes\n'); },
      pattern: /backup/,
    },
    {
      why: 'a file named .cursor',
      setup: (dir) => fs.writeFileSync(path.join(dir, '.cursor'), 'not a directory\n'),
      pattern: /not a directory/,
    },
    {
      why: 'a directory named hooks.json',
      setup: (dir) => fs.mkdirSync(hooksPath(dir), { recursive: true }),
      pattern: /not a regular file/,
    },
  ];
  for (const c of cases) {
    const dir = scratch(t);
    c.setup(dir);
    const r = aegis(dir, ['host', 'install', 'cursor']);
    assert.equal(r.status, 4, `${c.why}: ${r.stdout}${r.stderr}`);
    assert.match(r.stderr, c.pattern, c.why);
  }
});

test('install: a missing aegis on PATH is a warning, never a failure (the documented shell form)', (t) => {
  const dir = scratch(t);
  const r = aegis(dir, ['host', 'install', 'cursor'], { env: { PATH: '' } });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout + r.stderr, /not found on PATH/);
  assert.deepEqual(read(dir).hooks.sessionStart, [{ command: 'aegis status' }]);
});

test('uninstall: removes only the managed entry, prunes emptied containers, keeps foreign content and a backup', (t) => {
  const dir = scratch(t);
  assert.equal(aegis(dir, ['host', 'install', 'cursor']).status, 0);
  const r = aegis(dir, ['host', 'uninstall', 'cursor']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /removed/);
  assert.deepEqual(read(dir), { version: 1 }, 'the managed entry is gone; the documented version field remains');
  assert.ok(fs.existsSync(hooksPath(dir)), 'the file remains, never deleted');
  const again = aegis(dir, ['host', 'uninstall', 'cursor']);
  assert.equal(again.status, 0, again.stderr);
  assert.match(again.stdout, /nothing to remove/);
  const foreignOnly = scratch(t);
  const foreignSrc = '{"version":1,"hooks":{"afterFileEdit":[{"command":"x.sh"}]}}\n';
  writeHooks(foreignOnly, foreignSrc);
  const none = aegis(foreignOnly, ['host', 'uninstall', 'cursor']);
  assert.equal(none.status, 0, none.stderr);
  assert.match(none.stdout, /nothing to remove/);
  assert.equal(fs.readFileSync(hooksPath(foreignOnly), 'utf8'), foreignSrc, 'foreign hooks are never removed');
  const mixed = scratch(t);
  assert.equal(aegis(mixed, ['host', 'install', 'cursor']).status, 0);
  const withForeign = read(mixed);
  withForeign.hooks.sessionStart.unshift({ command: 'echo hi' });
  fs.writeFileSync(hooksPath(mixed), JSON.stringify(withForeign, null, 2) + '\n');
  fs.writeFileSync(backupPath(mixed), 'older generation bytes\n');
  const out = aegis(mixed, ['host', 'uninstall', 'cursor']);
  assert.equal(out.status, 0, out.stderr);
  assert.match(out.stdout, /backup kept/);
  assert.deepEqual(read(mixed).hooks.sessionStart, [{ command: 'echo hi' }], 'only the managed entry is removed');
  assert.ok(fs.existsSync(backupPath(mixed)), 'the backup is kept for manual recovery');
});

test('verify: reports the binding honestly (present exit 0, absent exit 9, unknown ids exit 2)', (t) => {
  const dir = scratch(t);
  const absent = aegis(dir, ['host', 'verify', 'cursor']);
  assert.equal(absent.status, 9, `absent: ${absent.stdout}${absent.stderr}`);
  assert.match(absent.stderr, /not present/);
  assert.equal(aegis(dir, ['host', 'install', 'cursor']).status, 0);
  const present = aegis(dir, ['host', 'verify', 'cursor']);
  assert.equal(present.status, 0, present.stderr);
  assert.match(present.stdout, /present/);
  const unknown = aegis(dir, ['host', 'verify', 'not-a-host']);
  assert.equal(unknown.status, 2);
  assert.match(unknown.stderr, /unknown host/);
  const usage = aegis(dir, ['host', 'uninstall']);
  assert.equal(usage.status, 2);
  assert.match(usage.stderr, /usage/);
});

test('missing-events: a manual-guidance cursor declaration refuses install with an honest message and writes nothing', (t) => {
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
      AEGIS_ADAPTER: pathToFileURL(path.join(REPO_ROOT, 'dist', 'adapters', 'cursor.js')).href,
      AEGIS_DECL: JSON.stringify(manual),
      AEGIS_DIR: dir,
    },
  });
  assert.equal(child.status, 4, `stderr: ${child.stderr}`);
  assert.match(child.stderr, /no supported events/);
  assert.ok(!fs.existsSync(path.join(dir, '.cursor')), 'nothing was written');
});

test('scope: cursor stays fixture-only - no smoke is recorded and nothing advertises beyond it', (t) => {
  const d = DECL();
  assert.equal(d.status, 'fixture-only', 'R3c delivers the adapter; the capability upgrades only with a real versioned-host smoke');
  assert.deepEqual(d.verified_with, [], 'no smoke exists - nothing upgrades by wishful thinking');
  assert.match(d.limitations.join(' '), /fixture-only/);
  const list = aegis(scratch(t), ['host', 'list']);
  assert.equal(list.status, 0, list.stderr);
  assert.match(list.stdout, /^cursor\tfixture-only\t/m);
});
