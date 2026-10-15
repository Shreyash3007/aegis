import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { REPO_ROOT } from './helpers.js';

test('calibration bank v1 remains frozen and distinguishes unrun comparisons', () => {
  const bank = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'evals', 'tasks.json'), 'utf8'));
  const digest = crypto.createHash('sha256').update(JSON.stringify(bank)).digest('hex');
  assert.equal(digest, '9b4682ac761d1aa81c3230a76c4e2baf9b6803d2ccec64ae7a4f7f7819d4a5a6',
    'append a successor bank instead of silently retuning v1');
  assert.equal(new Set(bank.tasks.map((t) => t.id)).size, bank.tasks.length);
  assert.match(bank.purpose, /not an independent held-out benchmark/);
});
