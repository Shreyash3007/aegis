// monitor target registry (07b writes what CI watches) + probe behavior:
// HEALTHY on a live loopback target, BREACH (exit 10) on unreachable,
// strict validation on registry writes. The stub runs in a SEPARATE child
// process (spawnSync blocks this loop - same pattern as eval-judge.test.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { scratch, aegis } from './helpers.js';

const STUB_SCRIPT = `
const http = require('node:http');
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/plain' });
  res.end('healthy');
});
server.listen(0, '127.0.0.1', () => console.log('PORT ' + server.address().port));
`;

function stub(t) {
  const child = spawn(process.execPath, ['-e', STUB_SCRIPT]);
  t.after(() => child.kill());
  let buf = '';
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('stub never reported a port: ' + buf)), 10000);
    child.stdout.on('data', (d) => {
      buf += d.toString();
      const m = buf.match(/PORT (\d+)/);
      if (m) { clearTimeout(timer); resolve(`http://127.0.0.1:${m[1]}/health`); }
    });
    child.on('error', reject);
  });
}

test('monitor target add/list/remove round trip with strict validation', (t) => {
  const dir = scratch(t);
  assert.match(aegis(dir, ['monitor', 'target', 'list']).stdout, /no monitor targets/);
  assert.equal(aegis(dir, ['monitor', 'target', 'add', 'notaurl']).status, 2);
  assert.equal(aegis(dir, ['monitor', 'target', 'add', 'http://x/health', '--benchmark-ms', '0']).status, 2);
  const a = aegis(dir, ['monitor', 'target', 'add', 'http://x/health', '--benchmark-ms', '150']);
  assert.equal(a.status, 0, a.stderr);
  assert.match(a.stdout, /benchmark 150ms/);
  assert.equal(aegis(dir, ['monitor', 'target', 'add', 'http://x/health']).status, 4);
  assert.match(aegis(dir, ['monitor', 'target', 'list']).stdout, /http:\/\/x\/health \(benchmark 150ms\)/);
  assert.equal(aegis(dir, ['monitor', 'target', 'remove', 'http://y/health']).status, 2);
  assert.equal(aegis(dir, ['monitor', 'target', 'remove', 'http://x/health']).status, 0);
  assert.match(aegis(dir, ['monitor', 'target', 'list']).stdout, /no monitor targets/);
});

test('monitor --once: HEALTHY on live target, BREACH exit 10 on unreachable', async (t) => {
  const dir = scratch(t);
  const url = await stub(t);
  assert.equal(aegis(dir, ['monitor', 'target', 'add', url]).status, 0);
  const h = aegis(dir, ['monitor', '--once']);
  assert.equal(h.status, 0, h.stderr + h.stdout);
  assert.match(h.stdout, /HEALTHY/);
  assert.equal(aegis(dir, ['monitor', 'target', 'remove', url]).status, 0);
  assert.equal(aegis(dir, ['monitor', 'target', 'add', 'http://127.0.0.1:1/health']).status, 0);
  const b = aegis(dir, ['monitor', '--once']);
  assert.equal(b.status, 10, b.stderr + b.stdout);
  assert.match(b.stderr, /BREACH on 1\/1 targets/);
});
