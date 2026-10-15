import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { writeReport } from '../scripts/lib/report-output.mjs';

test('release reports: repeated runs append successors and cannot overwrite explicit observations', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-report-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const first = writeReport(root, 'dogfood', '0.10.0', 'first evidence', []);
  const next = writeReport(root, 'dogfood', '0.10.0', 'second evidence', []);
  assert.notEqual(first, next);
  assert.ok(first.startsWith(path.join(root, '.aegis', 'reports')));
  assert.equal(fs.readFileSync(first, 'utf8'), 'first evidence');
  assert.throws(() => writeReport(root, 'dogfood', '0.10.0', 'replacement', ['--output', first]), /EEXIST/);
  assert.equal(fs.readFileSync(first, 'utf8'), 'first evidence');
  assert.throws(() => writeReport(root, 'pilot', '0.10.0', 'missing arg', ['--output']), /requires a file/);
});

test('release report entrypoints parse without conflicting helper names', () => {
  for (const script of ['dogfood.mjs', 'pilot.mjs']) {
    const file = fileURLToPath(new URL(`../scripts/${script}`, import.meta.url));
    const r = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
  }
});
