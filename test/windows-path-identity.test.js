import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { scratch, aegis, gitIn, readState } from './helpers.js';

function nestedRepository(t) {
  const root = scratch(t, { init: false });
  const dir = path.join(root, 'Long Parent Directory', 'repository');
  fs.mkdirSync(dir, { recursive: true });
  gitIn(dir, ['init', '-q', '-b', 'main']);
  gitIn(dir, ['commit', '--allow-empty', '-m', 'fixture']);
  const initialized = aegis(dir, ['init', '--yes']);
  assert.equal(initialized.status, 0, initialized.stderr);
  return dir;
}

function repositoryAlias(dir) {
  if (process.platform !== 'win32') return dir;
  // A real 8.3 alias, not a mocked path comparison. On volumes without short
  // names cmd returns the original path and the same lifecycle checks run.
  fs.writeFileSync(path.join(dir, '.aegis', 'short-path.cmd'),
    '@for %%I in ("%AEGIS_TEST_DIRECTORY%") do @echo %%~sI\r\n');
  const result = spawnSync('cmd', ['/d', '/c', '.aegis\\short-path.cmd'], {
    cwd: dir, env: { ...process.env, AEGIS_TEST_DIRECTORY: path.dirname(dir) }, encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  const alias = path.join(result.stdout.trim(), path.basename(dir));
  assert.equal(fs.realpathSync.native(alias), fs.realpathSync.native(dir));
  return alias;
}

test('path identity: hooks and uninstall agree on the physical repository behind its directory alias', (t) => {
  const dir = nestedRepository(t);
  const alias = repositoryAlias(dir);
  gitIn(dir, ['config', 'core.hooksPath', '.owner-hooks']);
  const hookHome = path.join(dir, '.owner-hooks');
  fs.mkdirSync(hookHome);
  const hook = path.join(hookHome, 'pre-commit');
  const owner = '#!/bin/sh\n# owner hook preserved\nexit 0\n';
  fs.writeFileSync(hook, owner);
  const installed = aegis(alias, ['hooks']);
  assert.equal(installed.status, 0, installed.stderr);
  assert.equal(fs.readFileSync(`${hook}.aegis-orig`, 'utf8'), owner);
  const removed = aegis(alias, ['remove']);
  assert.equal(removed.status, 0, removed.stderr);
  assert.equal(fs.readFileSync(hook, 'utf8'), owner);
  assert.ok(!fs.existsSync(path.join(dir, '.aegis')));
  assert.ok(fs.existsSync(path.join(dir, 'brain')));
});

for (const locked of [false, true]) {
  test(`path identity: an absent ${locked ? 'locked' : 'registered'} worktree cannot lose its lane through a directory alias`, (t) => {
    const dir = nestedRepository(t);
    const alias = repositoryAlias(dir);
    const created = aegis(alias, ['slice', 'create', 'retained']);
    assert.equal(created.status, 0, created.stderr);
    const before = readState(dir);
    const worktree = before.slices.retained.dir;
    if (locked) gitIn(dir, ['worktree', 'lock', '--reason', 'retention fixture', worktree]);
    // Only this test's disposable worktree is removed; Git still registers it.
    fs.rmSync(worktree, { recursive: true, force: true });
    const removed = aegis(alias, ['slice', 'remove', 'retained']);
    assert.equal(removed.status, 4, removed.stdout + removed.stderr);
    assert.match(removed.stderr, /still registered in Git/);
    assert.deepEqual(readState(dir).slices, before.slices);
    assert.deepEqual(readState(dir).lanes, before.lanes);
  });
}

test('path identity: an alias never permits hook installation outside the owned repository', (t) => {
  const dir = nestedRepository(t);
  const other = scratch(t, { init: false });
  const alias = repositoryAlias(dir);
  const external = path.join(other, 'external-hooks');
  fs.mkdirSync(external);
  const sentinel = path.join(external, 'pre-commit');
  fs.writeFileSync(sentinel, 'owner sentinel');
  gitIn(dir, ['config', 'core.hooksPath', external]);
  const refused = aegis(alias, ['hooks']);
  assert.equal(refused.status, 4, refused.stderr);
  assert.equal(fs.readFileSync(sentinel, 'utf8'), 'owner sentinel');
});
