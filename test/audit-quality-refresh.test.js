import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { scratch, aegis, gitIn } from './helpers.js';

test('audit: independent receipt refresh succeeds while combined quality stays blocked until both are current', (t) => {
  const dir = scratch(t);
  gitIn(dir, ['add', '.gitignore', 'brain']); gitIn(dir, ['commit', '-m', 'base']);
  gitIn(dir, ['switch', '-c', 'feature']);
  fs.writeFileSync(path.join(dir, 'plan.json'), JSON.stringify({ criteria: [{ id: 'AC1', statement: 'observable fixture', command: [process.execPath, '-e', 'process.exit(0)'] }], findings: [] }));
  gitIn(dir, ['add', 'plan.json']); gitIn(dir, ['commit', '-m', 'quality plan']);
  assert.equal(aegis(dir, ['quality', 'acceptance', 'feature', '--file', 'plan.json']).status, 0);
  assert.equal(aegis(dir, ['quality', 'review', 'feature', '--file', 'plan.json']).status, 0);
  gitIn(dir, ['commit', '--allow-empty', '-m', 'new candidate']);
  const review = aegis(dir, ['quality', 'review', 'feature', '--file', 'plan.json']);
  assert.equal(review.status, 0, review.stderr + review.stdout);
  assert.match(aegis(dir, ['quality', 'status', 'feature']).stdout, /STALE/);
  gitIn(dir, ['switch', 'main']);
  assert.equal(aegis(dir, ['merge', 'check', 'feature', '--require-quality']).status, 9, 'combined gate remains closed');
  gitIn(dir, ['switch', 'feature']);
  assert.equal(aegis(dir, ['quality', 'acceptance', 'feature', '--file', 'plan.json']).status, 0);
  assert.match(aegis(dir, ['quality', 'status', 'feature']).stdout, /QUALITY VERIFIED/);
});
