// Judgment ring (SPEC §7): native-wire loopback stub proves live verdicts,
// triage/cite/score/classify presets, degraded + mock + oversized paths,
// shape errors, and unreachable degradation. The stub speaks the exact
// TypeSafe native shape {answers: {id: {...}}} and counts requests.
//
// Like eval-judge.test.js, the stub runs in a SEPARATE child process:
// helpers.aegis() uses spawnSync, which blocks this process's event loop.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { scratch, aegis } from './helpers.js';

const STUB_SCRIPT = `
const http = require('node:http');
const mode = process.env.STUB_MODE || 'ok';
const scripted = JSON.parse(process.env.STUB_ANSWERS || '{}');
const server = http.createServer(async (req, res) => {
  let body = '';
  for await (const chunk of req) body += chunk;
  console.log('REQ ' + body.length);
  if (mode === 'error') { res.writeHead(500, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: 'boom' })); return; }
  let answers = {};
  try {
    const q = JSON.parse(body).questions || {};
    for (const [id, qq] of Object.entries(q)) {
      if (scripted[id]) { answers[id] = scripted[id]; continue; }
      if (qq.type === 'noul') answers[id] = { type: 'noul', noul: 0.9 };
      else if (qq.type === 'choice') { const k = Object.keys(qq.criteria)[0]; answers[id] = { type: 'choice', choice: k, confidence: 0.9, probabilities: { [k]: 0.9 } }; }
      else { answers[id] = { type: 'score', score: 0, confidence: 0.9, probabilities: { 0: 0.9 }, legend: { 0: qq.criteria[0] } }; }
    }
  } catch { /* malformed body -> empty answers (strict parse fails) */ }
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ model: 'jev-test', answers, usage: { input_tokens: 1, output_tokens: 1 } }));
});
server.listen(0, '127.0.0.1', () => console.log('PORT ' + server.address().port));
`;

/** Spawn the loopback stub. Resolves {url, requests()} once the port prints. */
function stub(t, env = {}) {
  const child = spawn(process.execPath, ['-e', STUB_SCRIPT], { env: { ...process.env, ...env } });
  t.after(() => child.kill());
  let buf = '';
  let reqs = 0;
  child.stdout.on('data', (d) => {
    buf += d.toString();
    reqs += (d.toString().match(/^REQ /gm) || []).length;
  });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('stub never reported a port: ' + buf)), 10000);
    child.stdout.on('data', () => {
      const m = buf.match(/PORT (\d+)/);
      if (m) { clearTimeout(timer); resolve({ url: `http://127.0.0.1:${m[1]}/v1/systemone`, requests: () => reqs }); }
    });
    child.on('error', reject);
  });
}

const live = (url) => ({ TYPESAFE_API_KEY: 'test-key', AEGIS_JEV_URL: url, JEV_BACKEND: '' });
const writeReq = (dir, name, obj) => {
  const f = path.join(dir, name);
  fs.writeFileSync(f, JSON.stringify(obj));
  return f;
};

test('jev judge: live verdicts with provenance + unsure escalation', async (t) => {
  const dir = scratch(t);
  const { url } = await stub(t, {
    STUB_ANSWERS: JSON.stringify({ lo: { type: 'choice', choice: 'b', confidence: 0.3, probabilities: { b: 0.4, a: 0.35 } } }),
  });
  const f = writeReq(dir, 'j.json', { state: 'suite green, 122/122', questions: [
    { id: 'hi', type: 'noul', question: 'Did the suite pass?' },
    { id: 'lo', type: 'choice', question: 'Pick?', options: { a: 'first', b: 'second' } },
  ] });
  const r = aegis(dir, ['jev', 'judge', '--file', f], { env: live(url) });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /backend: typesafe/);
  assert.match(r.stdout, /\[hi\] noul answer=0\.9 conf=0\.8\(estimated\) OK/);
  assert.match(r.stdout, /\[lo\] choice answer="b" conf=0\.3\(reported\) ESCALATE\(unsure\)/);
});

test('jev triage: 0.7 gate maps ACT/DROP/REVERIFY', async (t) => {
  const dir = scratch(t);
  const { url } = await stub(t, {
    STUB_ANSWERS: JSON.stringify({
      f1: { type: 'noul', noul: 0.95 },
      f2: { type: 'noul', noul: 0.1 },
      f3: { type: 'noul', noul: 0.9, confidence: 0.2 },
    }),
  });
  const f = writeReq(dir, 't.json', { state: 'merge oracle output', findings: [
    { id: 'f1', text: 'contract drift in slice' },
    { id: 'f2', text: 'typo in comment' },
    { id: 'f3', text: 'flaky timing' },
  ] });
  const r = aegis(dir, ['jev', 'triage', '--file', f], { env: live(url) });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /ACT f1 \(p=0\.95 conf=0\.9\)/);
  assert.match(r.stdout, /DROP f2 \(p=0\.1 conf=0\.8\)/);
  assert.match(r.stdout, /REVERIFY f3/);
  assert.match(r.stdout, /triage: 1 act, 1 drop, 1 reverify \(threshold 0\.7\)/);
});

test('jev cite: SUPPORTED/REFUTED against one shared evidence state', async (t) => {
  const dir = scratch(t);
  const { url } = await stub(t, {
    STUB_ANSWERS: JSON.stringify({ c2: { type: 'noul', noul: 0.05 } }),
  });
  const f = writeReq(dir, 'c.json', { evidence: 'suite log: 122 passed, 0 failed', claims: [
    { id: 'c1', text: 'the suite is green' },
    { id: 'c2', text: 'three tests failed' },
  ] });
  const r = aegis(dir, ['jev', 'cite', '--file', f], { env: live(url) });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /SUPPORTED c1/);
  assert.match(r.stdout, /REFUTED c2/);
  assert.match(r.stdout, /cite: 1 supported, 1 refuted, 0 reverify/);
});

test('jev score: all-noise cycle reports THEATER', async (t) => {
  const dir = scratch(t);
  const { url } = await stub(t);
  const f = writeReq(dir, 's.json', { state: 'review cycle 3', items: [
    { id: 'i1', text: 'nit: wording' }, { id: 'i2', text: 'nit: spacing' },
  ] });
  const r = aegis(dir, ['jev', 'score', '--file', f], { env: live(url) });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /cycle: THEATER \(all 2 item\(s\) noise/);
});

test('jev classify: pattern is authority, Jev only second opinion', async (t) => {
  const dir = scratch(t);
  const { url } = await stub(t, {
    STUB_ANSWERS: JSON.stringify({ autonomy: { type: 'choice', choice: 'L1', confidence: 0.9, probabilities: { L1: 0.9 } } }),
  });
  const lo = writeReq(dir, 'sacred.json', { action: 'rotate prod credential' });
  const r1 = aegis(dir, ['jev', 'classify', '--file', lo], { env: live(url) });
  assert.equal(r1.status, 0, r1.stderr);
  assert.match(r1.stdout, /pattern: L0 \(authority/);
  assert.match(r1.stdout, /jev: L1 .* DISAGREE - pattern rules/);
  const l2 = writeReq(dir, 'fix.json', { action: 'fix: typo in comment' });
  const r2 = aegis(dir, ['jev', 'classify', '--file', l2], { env: live(url) });
  assert.match(r2.stdout, /pattern: L2/);
  assert.match(r2.stdout, /DISAGREE - pattern rules/);
});

test('jev degraded: no key announces itself, judges nothing', async (t) => {
  const dir = scratch(t);
  const f = writeReq(dir, 't.json', { state: 'x', findings: [{ id: 'f1', text: 'y' }] });
  const r = aegis(dir, ['jev', 'triage', '--file', f], { env: { TYPESAFE_API_KEY: '', JEV_BACKEND: '' } });
  assert.equal(r.status, 0, r.stderr);
  const first = r.stdout.split('\n')[0];
  assert.match(first, /^DEGRADED: no TYPESAFE_API_KEY/);
  assert.match(r.stdout, /backend: degraded/);
  assert.match(r.stdout, /REVERIFY f1/);
  assert.match(r.stdout, /unreachable/);
});

test('jev mock: deterministic keyless judgments, zero network', async (t) => {
  const dir = scratch(t);
  const f = writeReq(dir, 'j.json', { state: 's', questions: [{ id: 'q', type: 'noul', question: 'true?' }] });
  const env = { TYPESAFE_API_KEY: '', JEV_BACKEND: 'mock' };
  const a = aegis(dir, ['jev', 'judge', '--file', f], { env });
  const b = aegis(dir, ['jev', 'judge', '--file', f], { env });
  assert.equal(a.status, 0, a.stderr);
  assert.match(a.stdout, /backend: mock/);
  const norm = (s) => s.replace(/latency: \d+ms/, 'latency: Nms');
  assert.equal(norm(a.stdout), norm(b.stdout), 'mock is deterministic across runs');
});

test('jev oversized: no request spent, zero network', async (t) => {
  const dir = scratch(t);
  const { url, requests } = await stub(t);
  const f = writeReq(dir, 'big.json', { state: 'x'.repeat(120_001), questions: [{ id: 'q', type: 'noul', question: 'y?' }] });
  const r = aegis(dir, ['jev', 'judge', '--file', f], { env: { ...live(url), JEV_BACKEND: '' } });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /ESCALATE\(oversized\)/);
  assert.equal(requests(), 0, 'oversized state spends no request');
});

test('jev shape errors are exit 4, never judgments', async (t) => {
  const dir = scratch(t);
  const env = { TYPESAFE_API_KEY: '', JEV_BACKEND: 'mock' };
  const missing = aegis(dir, ['jev', 'judge', '--file', path.join(dir, 'missing.json')], { env });
  assert.equal(missing.status, 4, missing.stderr);
  assert.match(missing.stderr, /unparseable/);
  const bad = writeReq(dir, 'bad.json', { state: 's', questions: [{ id: 'q', type: 'vibe', question: '?' }] });
  const r = aegis(dir, ['jev', 'judge', '--file', bad], { env });
  assert.equal(r.status, 4, r.stderr);
  assert.match(r.stderr, /noul\|choice\|score/);
  const tri = writeReq(dir, 'tri.json', { state: 's', findings: [] });
  assert.equal(aegis(dir, ['jev', 'triage', '--file', tri], { env }).status, 4);
});

test('jev unreachable: 500s degrade to escalations, exit stays 0', async (t) => {
  const dir = scratch(t);
  const err = await stub(t, { STUB_MODE: 'error' });
  const f = writeReq(dir, 'j.json', { state: 's', questions: [{ id: 'q', type: 'noul', question: 'true?' }] });
  const r = aegis(dir, ['jev', 'judge', '--file', f], { env: live(err.url) });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /ESCALATE\(unreachable\)/);
  assert.match(r.stdout, /HTTP 500/);
});
