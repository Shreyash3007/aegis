import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { scratch, aegis, readState, CLI, REPO_ROOT } from './helpers.js';

test('audit: exec history and wrapper output do not repeat credential-shaped argv', (t) => {
  const dir = scratch(t);
  const secret = 'sk-fixture-HISTORY123456789';
  const r = aegis(dir, ['exec', '--', process.execPath, '-e', 'process.exit(0)', secret]);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(!JSON.stringify(readState(dir).history).includes(secret));
  assert.ok(!(r.stdout + r.stderr).includes(secret));
});

test('audit: opt-in skill judge also redacts provider-bound file content', async (t) => {
  const dir = scratch(t);
  let body = '';
  const server = http.createServer(async (req, res) => {
    for await (const chunk of req) body += chunk;
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ choices: [{ message: { content: '{"pass":true,"reason":"fixture"}' } }] }));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const file = path.join(dir, 'skill.md');
  const secret = 'sk-fixture-JUDGE123456789';
  fs.copyFileSync(path.join(REPO_ROOT, 'skills', '01-discover', '01a-prd.md'), file);
  fs.appendFileSync(file, `\nCredential-shaped example: ${secret}\n`);
  const result = await new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [CLI, 'eval', file], {
      cwd: dir, env: { ...process.env, AEGIS_JUDGE_API_KEY: 'synthetic-fixture', AEGIS_JUDGE_URL: `http://127.0.0.1:${server.address().port}`, JEV_BACKEND: 'mock' },
    });
    let output = '';
    p.stdout.on('data', (d) => { output += d; }); p.stderr.on('data', (d) => { output += d; });
    p.once('error', reject); p.once('close', (code) => resolve({ code, output }));
  });
  assert.equal(result.code, 0, result.output);
  assert.ok(body.length > 0, 'positive control: the configured judge received a request');
  assert.ok(!body.includes(secret), 'skill-file credentials are redacted before egress');
});
