import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { judge } from '../dist/lib/jev.js';

test('audit: invalid provider domains cannot produce confident actionable judgments', async (t) => {
  let answer;
  const server = http.createServer(async (req, res) => {
    for await (const _ of req) { /* drain request */ }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ answers: { q: answer } }));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const saved = { key: process.env.TYPESAFE_API_KEY, url: process.env.AEGIS_JEV_URL, backend: process.env.JEV_BACKEND };
  process.env.TYPESAFE_API_KEY = 'synthetic-fixture-key';
  process.env.AEGIS_JEV_URL = `http://127.0.0.1:${server.address().port}`;
  process.env.JEV_BACKEND = '';
  t.after(() => {
    for (const [key, value] of Object.entries({ TYPESAFE_API_KEY: saved.key, AEGIS_JEV_URL: saved.url, JEV_BACKEND: saved.backend }))
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    server.closeAllConnections(); server.close();
  });
  for (const [question, invalid] of [
    [{ type: 'noul' }, { noul: -1 }],
    [{ type: 'noul' }, { noul: 1.2, confidence: 0.9 }],
    [{ type: 'noul' }, { noul: 0.9, confidence: 2 }],
    [{ type: 'noul' }, { noul: 0.9, confidence: null }],
    [{ type: 'choice', options: ['a', 'b'] }, { choice: 'NOT_AN_OPTION', confidence: 0.9 }],
    [{ type: 'choice', options: ['a', 'b'] }, { choice: 'a', probabilities: { a: 2, b: -1 } }],
    [{ type: 'choice', options: ['a', 'b'] }, { choice: 'a', probabilities: { not_a_label: 0.9 } }],
    [{ type: 'score', levels: ['bad', 'good'] }, { score: 99, confidence: 0.9 }],
    [{ type: 'score', levels: ['bad', 'good'] }, { score: 0.5, confidence: 0.9 }],
  ]) {
    answer = invalid;
    const r = await judge('fixture evidence', [{ id: 'q', question: 'judge evidence', ...question }]);
    assert.equal(r.escalated, true, JSON.stringify(invalid));
    assert.equal(r.verdicts[0].reason, 'unreachable');
  }
  answer = { choice: 'a', confidence: 0.9, probabilities: { a: 0.9, b: 0.1 } };
  const valid = await judge('fixture evidence', [{ id: 'q', question: 'pick one', type: 'choice', options: ['a', 'b'] }]);
  assert.equal(valid.escalated, false, 'valid positive control still earns a judgment');
});
