// Trigger-precision eval (SPEC §9, small-model half): scripted native-wire
// stub proves HIT/MISS accounting, the threshold gate with rewrite list,
// shape errors, and the degraded exit. Mock proves keyless plumbing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { scratch, aegis } from './helpers.js';

const STUB_SCRIPT = `
const http = require('node:http');
const scripted = JSON.parse(process.env.STUB_ANSWERS || '{}');
const server = http.createServer(async (req, res) => {
  let body = '';
  for await (const chunk of req) body += chunk;
  console.log('REQ');
  let answers = {};
  try {
    const q = JSON.parse(body).questions || {};
    for (const [id, qq] of Object.entries(q)) {
      if (scripted[id]) { answers[id] = scripted[id]; continue; }
      const k = Object.keys(qq.criteria)[0];
      answers[id] = { type: 'choice', choice: k, confidence: 0.9, probabilities: { [k]: 0.9 } };
    }
  } catch { /* malformed -> empty answers */ }
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ model: 'jev-test', answers }));
});
server.listen(0, '127.0.0.1', () => console.log('PORT ' + server.address().port));
`;

function stub(t, env = {}) {
  const child = spawn(process.execPath, ['-e', STUB_SCRIPT], { env: { ...process.env, ...env } });
  t.after(() => child.kill());
  let buf = '';
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('stub never reported a port: ' + buf)), 10000);
    child.stdout.on('data', (d) => {
      buf += d.toString();
      const m = buf.match(/PORT (\d+)/);
      if (m) { clearTimeout(timer); resolve(`http://127.0.0.1:${m[1]}/v1/systemone`); }
    });
    child.on('error', reject);
  });
}

const live = (url) => ({ TYPESAFE_API_KEY: 'test-key', AEGIS_JEV_URL: url, JEV_BACKEND: '' });
const writeCases = (dir, cases) => {
  const f = path.join(dir, 'cases.json');
  fs.writeFileSync(f, JSON.stringify(cases));
  return f;
};

test('eval trigger: all-HIT file passes with precision 1.00', async (t) => {
  const dir = scratch(t);
  const url = await stub(t, {
    STUB_ANSWERS: JSON.stringify({
      c1: { type: 'choice', choice: '04a-parallel-build', confidence: 0.9, probabilities: { '04a-parallel-build': 0.9 } },
      c2: { type: 'choice', choice: '01a-prd', confidence: 0.85, probabilities: { '01a-prd': 0.85 } },
    }),
  });
  const f = writeCases(dir, [
    { id: 'c1', prompt: 'spawn the slice teams', expect: '04a-parallel-build' },
    { id: 'c2', prompt: 'grill the requirements', expect: '01a-prd' },
  ]);
  const r = aegis(dir, ['eval', 'trigger', '--file', f], { env: live(url) });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /HIT c1 -> 04a-parallel-build/);
  assert.match(r.stdout, /trigger-precision: 2\/2 = 1\.00/);
});

test('eval trigger: below threshold exits 11 with the rewrite list', async (t) => {
  const dir = scratch(t);
  const url = await stub(t, {
    STUB_ANSWERS: JSON.stringify({
      c1: { type: 'choice', choice: '04a-parallel-build', confidence: 0.9, probabilities: { '04a-parallel-build': 0.9 } },
      c2: { type: 'choice', choice: '04a-parallel-build', confidence: 0.9, probabilities: { '04a-parallel-build': 0.9 } },
    }),
  });
  const f = writeCases(dir, [
    { id: 'c1', prompt: 'spawn the slice teams', expect: '04a-parallel-build' },
    { id: 'c2', prompt: 'grill the requirements', expect: '01a-prd' },
  ]);
  const r = aegis(dir, ['eval', 'trigger', '--file', f], { env: live(url) });
  assert.equal(r.status, 11, r.stderr);
  assert.match(r.stdout, /MISS\(got 04a-parallel-build\) c2: expected 01a-prd/);
  assert.match(r.stdout, /trigger-precision: 1\/2 = 0\.50/);
  assert.match(r.stdout, /rewrite: MISS\(got 04a-parallel-build\) c2/);
  assert.match(r.stderr, /rewrite the missed skills' triggers/);
});

test('eval trigger: shape errors are exit 4', async (t) => {
  const dir = scratch(t);
  const env = { TYPESAFE_API_KEY: '', JEV_BACKEND: 'mock' };
  const unknown = writeCases(dir, [{ id: 'c1', prompt: 'x', expect: '99z-nope' }]);
  const r1 = aegis(dir, ['eval', 'trigger', '--file', unknown], { env });
  assert.equal(r1.status, 4, r1.stderr);
  assert.match(r1.stderr, /unknown skill/);
  const dup = writeCases(dir, [
    { id: 'c1', prompt: 'x', expect: '01a-prd' },
    { id: 'c1', prompt: 'y', expect: '01a-prd' },
  ]);
  assert.equal(aegis(dir, ['eval', 'trigger', '--file', dup], { env }).status, 4);
  assert.equal(aegis(dir, ['eval', 'trigger', '--threshold', '2'], { env }).status, 4);
});

test('eval trigger: degraded backend exits 2 (unmeasurable, honestly)', async (t) => {
  const dir = scratch(t);
  const f = writeCases(dir, [{ id: 'c1', prompt: 'x', expect: '01a-prd' }]);
  const r = aegis(dir, ['eval', 'trigger', '--file', f], { env: { TYPESAFE_API_KEY: '', JEV_BACKEND: '' } });
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stderr, /needs a judgment backend/);
});

test('eval trigger: mock proves keyless plumbing end to end', async (t) => {
  const dir = scratch(t);
  const f = writeCases(dir, [{ id: 'c1', prompt: 'x', expect: '01a-prd' }]);
  const r = aegis(dir, ['eval', 'trigger', '--file', f], { env: { TYPESAFE_API_KEY: '', JEV_BACKEND: 'mock' } });
  assert.ok(r.status === 0 || r.status === 11, `plumbing exit, got ${r.status}: ${r.stderr}`);
  assert.match(r.stdout, /backend mock/);
  assert.match(r.stdout, /trigger-precision: \d+\/\d+ = \d\.\d\d/);
});
