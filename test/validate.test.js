// validate perf (SKILL-06d): .aegis/perf-budgets.json drives the bundle budget;
// breach -> exit 9. Absent file -> default budgets, honest UNMEASURED lines.
// No network: api_target_url is never set here, so the fetch path stays cold.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { scratch, aegis } from './helpers.js';

test('validate perf: budgets file present, bundle breach -> exit 9', (t) => {
  const dir = scratch(t);
  fs.mkdirSync(path.join(dir, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'dist', 'app.js'), `// ${'x'.repeat(2048)}\n`);
  fs.writeFileSync(path.join(dir, '.aegis', 'perf-budgets.json'),
    JSON.stringify({ bundle_kb: 1, api_p95_ms: 200, db_query_ms: 50, tti_ms: 3000 }, null, 2) + '\n');
  const r = aegis(dir, ['validate', 'perf']);
  assert.equal(r.status, 9);
  assert.match(r.stderr, /perf: FAIL/);
  assert.match(r.stderr, /JS bundle 2kb vs 1kb budget/);
});

test('validate perf: no budgets file -> defaults + honest UNMEASURED, exit 0', (t) => {
  const dir = scratch(t);
  const r = aegis(dir, ['validate', 'perf']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /perf: UNMEASURED/);
  assert.match(r.stdout, /no \.aegis\/perf-budgets\.json - default budgets/);
  assert.match(r.stdout, /db query 50ms budget UNMEASURED/);
  assert.match(r.stdout, /TTI 3000ms budget UNMEASURED/);
});
