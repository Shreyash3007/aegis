// Post-release audit of v0.10.0 (2026-10-17): adversarial reviewers reproduced
// defects in slice-removal identity, hook marker matching, link traversal and
// lock/uninstall edge cases. Each test here reproduces one finding BEFORE its
// fix; none weakens an existing safety assertion.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { scratch, aegis, gitIn, readState, CLI } from './helpers.js';

const hookPath = (dir, name) => path.join(dir, '.git', 'hooks', name);
const externalDir = (t, prefix) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(() => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* shared temp races */ } });
  return dir;
};
const childModule = (code, dir, timeout = 30_000) => spawnSync(process.execPath, ['--input-type=module', '-e', code],
  { cwd: dir, encoding: 'utf8', timeout, maxBuffer: 4 * 1024 * 1024 });
const lockModule = () => pathToFileURL(path.join(path.dirname(CLI), 'lib', 'lock.js')).href;

// --- A: marker matched as a whole-body substring clobbers a foreign hook ---
test('audit P1: a foreign hook that merely mentions the marker mid-body is backed up, not overwritten', (t) => {
  const dir = scratch(t, { init: false });
  const hook = hookPath(dir, 'pre-commit');
  fs.mkdirSync(path.dirname(hook), { recursive: true });
  const foreign = '#!/bin/sh\n# team standard: see also # AEGIS onboarding notes\necho team hook\n';
  fs.writeFileSync(hook, foreign);
  const r = aegis(dir, ['init', '--yes']);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(fs.readFileSync(`${hook}.aegis-orig`, 'utf8'), foreign, 'foreign body must be backed up before install');
});

// --- A2: remove deletes a foreign hook that mentions the marker and resurrects a stale backup ---
test('audit P1: remove keeps an operator hook that mentions the marker mid-body', (t) => {
  const dir = scratch(t);
  const hook = hookPath(dir, 'pre-commit');
  const operator = '#!/bin/sh\n# my own wrapper (see # AEGIS docs)\necho mine\n';
  fs.writeFileSync(hook, operator);
  const r = aegis(dir, ['remove']);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(fs.readFileSync(hook, 'utf8'), operator, 'an unmanaged hook is never deleted or replaced');
});

// --- B: re-install silently clobbers a second-generation foreign hook ---
test('audit P1: re-init refuses rather than clobber a replaced foreign hook when a backup already exists', (t) => {
  const dir = scratch(t, { init: false });
  const hook = hookPath(dir, 'pre-commit');
  fs.mkdirSync(path.dirname(hook), { recursive: true });
  fs.writeFileSync(hook, '#!/bin/sh\necho first foreign\n');
  assert.equal(aegis(dir, ['init', '--yes']).status, 0);
  const operator = '#!/bin/sh\necho operator replacement\n';
  fs.writeFileSync(hook, operator);
  const r = aegis(dir, ['init', '--yes', '--overwrite']);
  assert.equal(r.status, 4, r.stdout + r.stderr);
  assert.equal(fs.readFileSync(hook, 'utf8'), operator, 'the operator hook must survive the refusal');
  assert.match(r.stderr, /aegis-orig/i);
});

// --- F: install writes through a symlinked hook file ---
test('audit P1: a symlinked hook file is refused, never written through', (t) => {
  const store = externalDir(t, 'aegis-hook-store-');
  const target = path.join(store, 'pre-commit');
  fs.writeFileSync(target, '#!/bin/sh\n# AEGIS: old banner\necho old managed\n');
  const dir = scratch(t);
  const link = hookPath(dir, 'pre-commit');
  fs.rmSync(link, { force: true });
  try { fs.symlinkSync(target, link, 'file'); }
  catch (e) { if (e?.code === 'EPERM' || e?.code === 'EACCES') return t.skip('symlink privilege unavailable on this host'); throw e; }
  const before = fs.readFileSync(target, 'utf8');
  const r = aegis(dir, ['hooks']);
  assert.equal(r.status, 4, r.stdout + r.stderr);
  assert.equal(fs.readFileSync(target, 'utf8'), before, 'the link target outside the repo must be untouched');
  assert.match(r.stderr, /link/i);
});

// --- H: a symlinked hook file blocks uninstall ---
test('audit P1: uninstall skips a symlinked hook with a note instead of failing', (t) => {
  const dir = scratch(t);
  const target = path.join(dir, 'operator-hook');
  fs.writeFileSync(target, '#!/bin/sh\n# AEGIS: kept centrally\necho managed\n');
  const link = hookPath(dir, 'pre-commit');
  fs.rmSync(link, { force: true });
  try { fs.symlinkSync(target, link, 'file'); }
  catch (e) { if (e?.code === 'EPERM' || e?.code === 'EACCES') return t.skip('symlink privilege unavailable on this host'); throw e; }
  const r = aegis(dir, ['remove']);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.ok(fs.lstatSync(link).isSymbolicLink(), 'the link itself is not deleted through');
  assert.ok(fs.existsSync(target), 'the link target is untouched');
  assert.match(r.stdout, /skip/i);
});

// --- E: external core.hooksPath permanently blocks uninstall ---
test('audit P1: uninstall completes with an external hooksPath, leaving the external store untouched', (t) => {
  const dir = scratch(t);
  const ext = externalDir(t, 'aegis-ext-hooks-');
  const sentinel = path.join(ext, 'pre-commit');
  fs.writeFileSync(sentinel, 'external sentinel\n');
  gitIn(dir, ['config', 'core.hooksPath', ext]);
  const r = aegis(dir, ['remove']);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(fs.readFileSync(sentinel, 'utf8'), 'external sentinel\n');
  assert.ok(!fs.existsSync(hookPath(dir, 'pre-commit')), 'Aegis-managed hooks in the default dir are still cleaned');
  assert.match(r.stdout, /core\.hooksPath|outside this repo/i);
});

// --- I: remove crashes mid-uninstall, leaving a half-uninstalled repo ---
(process.platform === 'win32' ? test : test.skip)('audit P1: a pinned .aegis aborts uninstall before hooks or .gitignore change', (t) => {
  const dir = scratch(t);
  const stateFile = path.join(dir, '.aegis', 'state.json');
  const hook = hookPath(dir, 'pre-commit');
  // Node opens files with share-delete, which does NOT block unlink; hold a
  // genuine no-share handle (the AV/backup interference shape) from PowerShell.
  const holder = spawn('powershell', ['-NoProfile', '-Command',
    `$f=[System.IO.File]::Open(${JSON.stringify(stateFile)},'Open','Read','None'); Start-Sleep -Seconds 60; $f.Close()`]);
  t.after(() => { try { holder.kill('SIGKILL'); } catch { /* already exited */ } });
  const wait = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  const openable = () => { try { const p = fs.openSync(stateFile, 'r+'); fs.closeSync(p); return true; } catch { return false; } };
  // The pin is active when a plain open is DENIED (FileShare.None). Never
  // proceed on an unconfirmed pin: under load the holder may start late.
  const pinnedBy = Date.now() + 20_000;
  let pinned = false;
  while (Date.now() < pinnedBy) { if (!openable()) { pinned = true; break; } wait(100); }
  if (!pinned) { try { holder.kill('SIGKILL'); } catch { /* already exited */ } return t.skip('could not establish the no-share pin'); }
  const refused = aegis(dir, ['remove']);
  assert.equal(refused.status, 4, refused.stdout + refused.stderr);
  assert.ok(fs.existsSync(hook), 'hooks must be untouched when the machine tree cannot go');
  assert.ok(fs.readFileSync(path.join(dir, '.gitignore'), 'utf8').includes('.aegis/'), '.gitignore must be untouched');
  assert.ok(fs.existsSync(stateFile), 'the pinned source of truth survives the refused uninstall');
  // Release the pin; wait until the handle is actually gone, then complete.
  try { holder.kill('SIGKILL'); } catch { /* already exited */ }
  const freedBy = Date.now() + 20_000;
  while (Date.now() < freedBy && !openable()) wait(100);
  const done = aegis(dir, ['remove']);
  assert.equal(done.status, 0, done.stdout + done.stderr);
});

// --- J: a junctioned .git installs hooks into a foreign repository ---
test('audit P1: a linked .git entry is refused before any command runs', (t) => {
  const foreign = scratch(t, { init: false });
  const victim = scratch(t, { init: false });
  fs.rmSync(path.join(victim, '.git'), { recursive: true, force: true });
  fs.symlinkSync(path.join(foreign, '.git'), path.join(victim, '.git'), process.platform === 'win32' ? 'junction' : 'dir');
  const before = fs.readdirSync(path.join(foreign, '.git', 'hooks')).sort().join(',');
  const r = aegis(victim, ['status']);
  assert.equal(r.status, 4, r.stdout + r.stderr);
  assert.match(r.stderr, /linked \.git/i);
  assert.equal(fs.readdirSync(path.join(foreign, '.git', 'hooks')).sort().join(','), before, 'no hooks land in the foreign repo');
  assert.ok(!fs.existsSync(path.join(victim, '.aegis')), 'no Aegis state is created through the link');
});

// --- K: slice remove releases the lane while Git still knows a moved worktree ---
test('audit P1: a moved worktree keeps its slice registration and lane', (t) => {
  const dir = scratch(t);
  assert.equal(aegis(dir, ['slice', 'create', 'mv1']).status, 0);
  const meta = readState(dir).slices.mv1;
  const moved = `${meta.dir}-moved`;
  gitIn(dir, ['worktree', 'move', meta.dir, moved]);
  fs.writeFileSync(path.join(moved, 'dirty.txt'), 'uncommitted work');
  const r = aegis(dir, ['slice', 'remove', 'mv1']);
  assert.equal(r.status, 4, r.stdout + r.stderr);
  assert.match(r.stderr, /still registered in Git( at another path)?/i);
  assert.ok(readState(dir).slices.mv1, 'registration is retained');
  assert.ok(readState(dir).lanes.active.includes('mv1'), 'lane is retained');
  assert.ok(fs.existsSync(path.join(moved, 'dirty.txt')), 'the moved worktree and its dirty work survive');
});

// --- M: dead-end recovery message when the directory survives but Git forgot it ---
test('audit P2: an orphaned worktree directory names the manual recovery step', (t) => {
  const dir = scratch(t);
  assert.equal(aegis(dir, ['slice', 'create', 'keep1']).status, 0);
  const meta = readState(dir).slices.keep1;
  fs.rmSync(path.join(dir, '.git', 'worktrees', 'keep1'), { recursive: true, force: true });
  const r = aegis(dir, ['slice', 'remove', 'keep1']);
  assert.equal(r.status, 4, r.stdout + r.stderr);
  assert.match(r.stderr, /no longer registers|re-?register|delete the (worktree )?directory/i);
  assert.ok(readState(dir).slices.keep1, 'slice retained');
  assert.ok(fs.existsSync(meta.dir), 'directory preserved for manual recovery');
});

// --- C: reclaimer crashes with a raw EPERM when the dead owner's lock is undeletable ---
test('audit P2: an undeletable dead-owner lock fails closed with guidance, not a raw crash', (t) => {
  const dir = scratch(t);
  const resource = path.join(dir, '.aegis', 'stale');
  const file = `${resource}.lock`;
  fs.writeFileSync(file, JSON.stringify({ pid: 99999999, at: Date.now(), token: 'x' }));
  const code = `import fs from 'node:fs'; import path from 'node:path';
    const rm = fs.rmSync; const file = ${JSON.stringify(file)};
    fs.rmSync = function (p, ...a) { if (path.resolve(String(p)) === file) throw Object.assign(new Error('pin'), { code: 'EPERM' }); return rm.call(this, p, ...a); };
    const { lockFile } = await import(${JSON.stringify(lockModule())});
    const release = lockFile(${JSON.stringify(resource)}); release();`;
  const r = childModule(code, dir, 30_000);
  assert.equal(r.status, 4, `expected die(4), got:\n${r.stdout}\n${r.stderr}`);
  assert.match(r.stderr, /cannot be removed|dead owner/i);
  assert.ok(!fs.existsSync(`${file}.reclaim`), 'the reclaimer guard must not linger');
});

// --- D: a failed owner-write poisons the lock file permanently ---
test('audit P2: a failed owner-write does not leave a poisoned zero-byte lock', (t) => {
  const dir = scratch(t);
  const resource = path.join(dir, '.aegis', 'poison');
  const file = `${resource}.lock`;
  const failing = `import fs from 'node:fs';
    const write = fs.writeFileSync; let thrown = false;
    fs.writeFileSync = function (fd, data, ...a) { if (!thrown && typeof fd === 'number' && String(data).includes('"pid"')) { thrown = true; throw Object.assign(new Error('disk'), { code: 'EACCES' }); } return write.call(this, fd, data, ...a); };
    const { lockFile } = await import(${JSON.stringify(lockModule())});
    lockFile(${JSON.stringify(resource)});`;
  const first = childModule(failing, dir, 30_000);
  assert.notEqual(first.status, 0, 'the failed acquisition must not report success');
  assert.ok(!fs.existsSync(file), `the exclusively-created file must be cleaned up, found: ${fs.existsSync(file) ? fs.statSync(file).size + ' bytes' : ''}`);
  const recovering = `import fs from 'node:fs';
    const { lockFile } = await import(${JSON.stringify(lockModule())});
    const release = lockFile(${JSON.stringify(resource)}); release(); console.log('RECOVERED');`;
  const second = childModule(recovering, dir, 30_000);
  assert.equal(second.status, 0, `later contenders must not inherit a poisoned lock:\n${second.stdout}\n${second.stderr}`);
  assert.match(second.stdout, /RECOVERED/);
});

// --- L: a live-but-unreadable lock is misdiagnosed as malformed within 160ms ---
test('audit P2: an unreadable lock reports an access failure, not false corruption', (t) => {
  const dir = scratch(t);
  const resource = path.join(dir, '.aegis', 'unreadable');
  const file = `${resource}.lock`;
  fs.writeFileSync(file, JSON.stringify({ pid: process.pid, at: Date.now(), token: 'live' }));
  const code = `import fs from 'node:fs'; import path from 'node:path';
    const read = fs.readFileSync; const file = ${JSON.stringify(file)};
    fs.readFileSync = function (p, ...a) { if (path.resolve(String(p)) === file) throw Object.assign(new Error('pin'), { code: 'EPERM' }); return read.call(this, p, ...a); };
    const { lockFile } = await import(${JSON.stringify(lockModule())});
    lockFile(${JSON.stringify(resource)});`;
  const r = childModule(code, dir, 30_000);
  assert.equal(r.status, 4, `expected die(4), got:\n${r.stdout}\n${r.stderr}`);
  assert.match(r.stderr, /cannot be read/i);
  assert.doesNotMatch(r.stderr, /malformed/i);
});

// --- G (latent, win32): two spellings of one lock self-contend in one process ---
(process.platform === 'win32' ? test : test.skip)('audit P2: alias spellings of one lock are reentrant within a process', (t) => {
  const dir = scratch(t);
  const resource = path.join(dir, '.aegis', 'contended');
  const variant = path.join(dir, '.AEGIS', 'contended');
  const code = `import fs from 'node:fs';
    const { lockFile } = await import(${JSON.stringify(lockModule())});
    const r1 = lockFile(${JSON.stringify(resource)});
    const r2 = lockFile(${JSON.stringify(variant)});
    r2(); r1(); console.log('BOTH_RELEASED');`;
  const r = childModule(code, dir, 15_000);
  assert.equal(r.status, 0, `variant spelling self-contended:\n${r.stdout}\n${r.stderr}`);
  assert.match(r.stdout, /BOTH_RELEASED/);
});
