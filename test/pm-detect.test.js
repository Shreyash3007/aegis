// validate tests suite: package-manager detection. The suite must run the
// right command for the repo (npm/yarn/pnpm/bun) instead of assuming npm.
// Detection order: package.json#packageManager first, then lockfiles.
// Asserts on the recorded Result (.aegis/validation/tests.json) so the test
// is deterministic whether or not the detected PM is actually installed -
// the command string is the citation; the run may PASS or FAIL.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { scratch, aegis } from './helpers.js';

test('validate tests: pnpm-lock.yaml -> command "pnpm test"', (t) => {
  const dir = scratch(t);
  fs.writeFileSync(path.join(dir, 'package.json'),
    JSON.stringify({ name: 'demo', scripts: { test: 'node -e "0"' } }, null, 2) + '\n');
  fs.writeFileSync(path.join(dir, 'pnpm-lock.yaml'), 'lockfileVersion: "6.0"\n');
  aegis(dir, ['validate', 'tests']); // PASS if pnpm installed, FAIL otherwise
  const r = JSON.parse(fs.readFileSync(path.join(dir, '.aegis', 'validation', 'tests.json'), 'utf8'));
  assert.equal(r.suite, 'tests');
  assert.equal(r.tool, 'pnpm');
  assert.equal(r.command, 'pnpm test');
  // A missing runner is an environment fact, not a misdetection: UNMEASURED is
  // the honest outcome there (v0.11 R6). CI runners do not ship pnpm, so
  // asserting PASS-or-FAIL here made the suite depend on the machine.
  assert.ok(['PASS', 'FAIL', 'UNMEASURED'].includes(r.status), `unexpected status ${r.status}`);
  if (r.status === 'UNMEASURED') assert.match(r.summary, /not found on PATH/);
});

test('validate tests: packageManager "yarn@4.0.0" (no lockfile) -> command "yarn test"', (t) => {
  const dir = scratch(t);
  fs.writeFileSync(path.join(dir, 'package.json'),
    JSON.stringify({ name: 'demo', packageManager: 'yarn@4.0.0', scripts: { test: 'node -e "0"' } }, null, 2) + '\n');
  aegis(dir, ['validate', 'tests']); // no lockfile; packageManager field wins
  const r = JSON.parse(fs.readFileSync(path.join(dir, '.aegis', 'validation', 'tests.json'), 'utf8'));
  assert.equal(r.suite, 'tests');
  assert.equal(r.tool, 'yarn');
  assert.equal(r.command, 'yarn test');
  // Same environment fact as the pnpm case: an absent runner is UNMEASURED,
  // never a misdetection, so the assertion must not require a local install.
  assert.ok(['PASS', 'FAIL', 'UNMEASURED'].includes(r.status), `unexpected status ${r.status}`);
  if (r.status === 'UNMEASURED') assert.match(r.summary, /not found on PATH/);
});
