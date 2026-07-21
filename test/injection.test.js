// Injection safety: branch/slice names are user input and must never reach a
// shell. The runtime uses execFileSync argv everywhere; these tests prove a
// classic `;touch` payload is inert (non-zero exit AND no file created).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { scratch, aegis } from './helpers.js';

test("injection attempt via merge check is inert: 'x;touch PWNED'", (t) => {
  const dir = scratch(t);
  const r = aegis(dir, ['merge', 'check', 'x;touch PWNED']);
  assert.notEqual(r.status, 0, 'unknown branch must be refused');
  assert.ok(!fs.existsSync(path.join(dir, 'PWNED')), 'payload must not execute');
});

test("injection attempt via slice create is inert: 'x;touch PWNED'", (t) => {
  const dir = scratch(t);
  const r = aegis(dir, ['slice', 'create', 'x;touch PWNED']);
  assert.notEqual(r.status, 0, 'invalid slice name must be refused');
  assert.ok(!fs.existsSync(path.join(dir, 'PWNED')), 'payload must not execute');
  const wtRoot = `${dir}-worktrees`;
  if (fs.existsSync(wtRoot))
    assert.ok(!fs.existsSync(path.join(wtRoot, 'PWNED')), 'payload must not execute');
});
