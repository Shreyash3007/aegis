// Model judge (opt-in): a stub of the OpenAI-compatible chat endpoint proves
// (a) all-pass verdicts keep exit 0 and print judge counts, (b) one fail
// verdict makes eval exit 11, (c) no key means byte-identical lint-only
// behavior (SKIPPED line, exit 0, zero requests), (d) unparseable verdicts
// degrade to JUDGE-ERROR without affecting the exit code.
//
// The stub runs in a SEPARATE child process: helpers.aegis() uses spawnSync,
// which blocks this process's event loop, so an in-process server could never
// accept the CLI's request (deadlock until the 30s judge timeout).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { scratch, aegis } from './helpers.js';

const SECTIONS = [
  '## Expert Persona', '## Purpose', '## Trigger', '## Entry Criteria',
  '## Environment Requirements', '## Input Schema', '## Execution Steps',
  '## Self-Critique Protocol', '## Error Escalation Protocol', '## Output Schema',
  '## Measurement Citations', '## CLI Contract', '## Brain Files',
  '## Next Skill', '## Human Touchpoints',
];

/** A lint-clean skill file so only the judge verdict decides the outcome. */
function writeSkill(dir) {
  const file = path.join(dir, 'judged.md');
  const body = SECTIONS.map((s) => `${s}\n\ncontent`).join('\n\n');
  fs.writeFileSync(file, `# SKILL-99z: JUDGED\n\n${body}\n`);
  return file;
}

const STUB_SCRIPT = `
const http = require('node:http');
const content = process.env.STUB_CONTENT;
const server = http.createServer(async (req, res) => {
  for await (const _ of req) { /* drain the request body */ }
  console.log('REQ'); // one line per request, counted by the parent
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content } }] }));
});
server.listen(0, '127.0.0.1', () => console.log('PORT ' + server.address().port));
`;

/** Spawn the loopback stub. `content` is the raw assistant-message string.
 *  Resolves to { url, requests() } once it reports its port; the child is
 *  killed via t.after. */
function judgeStub(t, content) {
  const child = spawn(process.execPath, ['-e', STUB_SCRIPT], {
    env: { STUB_CONTENT: content },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  t.after(() => child.kill());
  let requests = 0;
  return new Promise((resolve, reject) => {
    let buf = '';
    child.stdout.on('data', (d) => {
      buf += d;
      requests = (buf.match(/^REQ$/gm) || []).length;
      const m = buf.match(/PORT (\d+)/);
      if (m) resolve({ url: `http://127.0.0.1:${m[1]}/v1/chat/completions`, requests: () => requests });
    });
    child.on('exit', (code) => reject(new Error(`judge stub exited early (${code})`)));
  });
}

const judgeEnv = (url) => ({
  AEGIS_JUDGE_API_KEY: 'test-key',
  AEGIS_JUDGE_URL: url,
  AEGIS_JUDGE_MODEL: 'test-model',
});

/** The stub's REQ lines cross a pipe asynchronously; poll briefly after the
 *  CLI exits so the count assertion isn't racy. */
async function waitForRequests(stub, n) {
  for (let i = 0; i < 50 && stub.requests() !== n; i++)
    await new Promise((r) => setTimeout(r, 20));
  return stub.requests();
}

test('eval judge: all-pass verdicts keep exit 0 and print judge counts', async (t) => {
  const dir = scratch(t);
  const file = writeSkill(dir);
  const stub = await judgeStub(t, JSON.stringify({ pass: true, reason: 'concrete steps and criteria' }));
  const r = aegis(dir, ['eval', file], { env: judgeEnv(stub.url) });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /model judge: 1\/1 passed, 0 failed, 0 judge-error/);
  assert.equal(await waitForRequests(stub, 1), 1);
});

test('eval judge: a fail verdict alone causes exit 11', async (t) => {
  const dir = scratch(t);
  const file = writeSkill(dir);
  const stub = await judgeStub(t, JSON.stringify({ pass: false, reason: 'steps are aspirational, not executable' }));
  const r = aegis(dir, ['eval', file], { env: judgeEnv(stub.url) });
  assert.equal(r.status, 11);
  assert.match(r.stdout, /JUDGE-FAIL judged\.md: steps are aspirational/);
  assert.match(r.stdout, /model judge: 0\/1 passed, 1 failed, 0 judge-error/);
});

test('eval judge: key unset means SKIPPED, exit 0, and no requests', async (t) => {
  const dir = scratch(t);
  const file = writeSkill(dir);
  const stub = await judgeStub(t, JSON.stringify({ pass: true, reason: 'unused' }));
  const r = aegis(dir, ['eval', file]); // no judge env at all
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /model judge: SKIPPED \(no API key - honest\)/);
  assert.equal(stub.requests(), 0);
});

test('eval judge: unparseable verdicts are JUDGE-ERROR, never exit 11', async (t) => {
  const dir = scratch(t);
  const file = writeSkill(dir);
  const stub = await judgeStub(t, 'no json here');
  const r = aegis(dir, ['eval', file], { env: judgeEnv(stub.url) });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /JUDGE-ERROR judged\.md: unparseable judge verdict/);
  assert.match(r.stdout, /model judge: 0\/1 passed, 0 failed, 1 judge-error/);
});
