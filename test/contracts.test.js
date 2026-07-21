// Contracts (N1): verified against the BASE branch, honestly degraded.
// No remote -> exit 0 but UNVERIFIED. Remote without the merge -> exit 4.
// Merged + pushed -> exit 0.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { scratch, aegis, gitIn } from './helpers.js';

function commitContracts(dir) {
  fs.mkdirSync(path.join(dir, 'src', 'contracts'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'contracts', 'api.ts'), 'export interface Api { v: 1 }\n');
  gitIn(dir, ['add', 'src/contracts']);
  // --no-verify: the pre-push/pre-commit hooks are not the subject under test
  gitIn(dir, ['commit', '-q', '--no-verify', '-m', 'contracts']);
}

test('contracts: no remote -> exit 0 with UNVERIFIED wording', (t) => {
  const dir = scratch(t);
  commitContracts(dir);
  const r = aegis(dir, ['contracts']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /UNVERIFIED/);
});

test('contracts: remote without merge -> exit 4; merged+pushed -> exit 0', (t) => {
  const dir = scratch(t);
  const bare = fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-remote-'));
  t.after(() => fs.rmSync(bare, { recursive: true, force: true }));
  gitIn(dir, ['init', '--bare', '-q', '-b', 'main', bare]);
  gitIn(dir, ['remote', 'add', 'origin', bare]);
  gitIn(dir, ['push', '-q', '--no-verify', 'origin', 'main']); // base WITHOUT contracts
  commitContracts(dir);
  const unmerged = aegis(dir, ['contracts']);
  assert.equal(unmerged.status, 4);
  assert.match(unmerged.stderr, /not in origin\/main/);
  gitIn(dir, ['push', '-q', '--no-verify', 'origin', 'main']); // now merged to base
  const merged = aegis(dir, ['contracts']);
  assert.equal(merged.status, 0, merged.stderr);
  assert.match(merged.stdout, /verified merged to origin\/main/);
});
