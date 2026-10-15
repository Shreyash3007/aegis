import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { gitBlob, verifiedSource, readSourceLock } from '../dist/lib/blade-source.js';
import { scratch, aegis, REPO_ROOT } from './helpers.js';

test('blade source: verifies canonical Git object bytes, never just a skill name', (t) => {
  // Known Git object ID for "hello\n", independent of this implementation.
  const blob = 'ce013625030ba8dba906f756967f9e9ca394464a';
  assert.equal(gitBlob(Buffer.from('hello\n')), blob);
  const dir = scratch(t);
  const file = path.join(dir, 'SKILL.md');
  fs.writeFileSync(file, 'hello\n');
  assert.equal(verifiedSource(file, blob), true);
  fs.writeFileSync(file, 'hello (modified)\n');
  assert.equal(verifiedSource(file, blob), false);
});

test('blade resolve: mismatched source reports native fallback and collision rules', (t) => {
  const dir = scratch(t);
  const lock = readSourceLock(path.join(REPO_ROOT, 'skills', 'superpowers.lock.json'));
  const pin = lock.skills[0];
  const root = path.join(dir, 'fixture-upstream');
  fs.mkdirSync(path.dirname(path.join(root, pin.path)), { recursive: true });
  fs.writeFileSync(path.join(root, pin.path), 'hello\n');
  const fallback = aegis(dir, ['blade', 'resolve', pin.name, '--root', root]);
  assert.equal(fallback.status, 0, fallback.stderr);
  assert.match(fallback.stdout, /UNMEASURED/);
  assert.match(fallback.stdout, /native fallback:/);
  assert.match(fallback.stdout, /Collision rules:/);
});

test('Superpowers integration: all six pins, fallback files and phases are explicit', () => {
  const lock = readSourceLock(path.join(REPO_ROOT, 'skills', 'superpowers.lock.json'));
  const routing = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'skills', 'routing.json'), 'utf8'));
  assert.equal(lock.skills.length, 6);
  assert.equal(lock.commit, '8ca22dba9a94f28898bbce59f2537ff4d87c747d');
  for (const pin of lock.skills) {
    assert.ok(fs.existsSync(path.join(REPO_ROOT, 'skills', pin.fallback)), pin.name);
    assert.ok(routing.blades.some((b) => b.name === pin.name && b.source === `superpowers.lock.json#${pin.name}`));
  }
});
