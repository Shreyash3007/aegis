// Repo-root discovery, unknown-command handling, and corrupt-state honesty.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { scratch, aegis } from './helpers.js';

test('running a command outside any git repo -> exit 1', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-norepo-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const r = aegis(dir, ['status']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /not a git repo/);
});

test('running from a subdirectory of a repo works (repo-root discovery)', (t) => {
  const dir = scratch(t);
  const sub = path.join(dir, 'deep', 'nested');
  fs.mkdirSync(sub, { recursive: true });
  const r = aegis(sub, ['status']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /state: 00a/);
});

test('unknown command -> non-zero with help text', (t) => {
  const dir = scratch(t);
  const r = aegis(dir, ['frobnicate']);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /unknown command: frobnicate/);
  assert.match(r.stderr, /Usage: aegis <command> \[args\]/);
});

test('corrupt .aegis/transitions.json -> exit 2 with actionable message', (t) => {
  const dir = scratch(t);
  fs.writeFileSync(path.join(dir, '.aegis', 'transitions.json'), '{ not json');
  const r = aegis(dir, ['status']);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /corrupt \.aegis\/transitions\.json/);
  assert.match(r.stderr, /aegis init/); // actionable: points at recovery
});
