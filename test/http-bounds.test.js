import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { postJson, probeUrl } from '../dist/lib/http.js';

async function server(t, handler) {
  const s = http.createServer(handler);
  await new Promise((resolve) => s.listen(0, '127.0.0.1', resolve));
  t.after(() => { s.closeAllConnections(); s.close(); });
  return `http://127.0.0.1:${s.address().port}`;
}

test('HTTP bounds: a continuously streaming response cannot bypass the total deadline', async (t) => {
  const url = await server(t, (_, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    const timer = setInterval(() => res.write(' '), 20);
    const end = setTimeout(() => res.end('{}'), 600);
    res.on('close', () => { clearInterval(timer); clearTimeout(end); });
  });
  await assert.rejects(postJson(url, {}, {}, { timeoutMs: 100, maxRetries: 0 }), /timed out/);
  const probed = await probeUrl(url, 100);
  assert.equal(probed.status, 'timeout');
});

test('HTTP bounds: oversized JSON responses are rejected before unbounded buffering', async (t) => {
  const url = await server(t, (_, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ large: 'x'.repeat(5000) }));
  });
  await assert.rejects(postJson(url, {}, {}, { timeoutMs: 1000, maxRetries: 0, maxResponseBytes: 1024 }), /response.*limit/i);
});
