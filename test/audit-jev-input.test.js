import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { scratch, aegis } from './helpers.js';

test('audit: malformed or ambiguous judgment questions are rejected before inference', (t) => {
  const dir = scratch(t);
  const file = path.join(dir, 'request.json');
  const q = { id: 'one', type: 'noul', question: 'is it verified?' };
  for (const request of [
    null,
    { state: 'evidence', questions: [q, q] },
    { state: 'evidence', questions: [{ ...q, id: 12 }] },
    { state: 'evidence', questions: [{ ...q, criteria: { true: null, false: 'no' } }] },
    { state: 'evidence', questions: [{ ...q, type: 'choice', options: ['same', 'same'] }] },
    { state: 'evidence', questions: [{ ...q, type: 'choice', options: { a: 1, b: 'two' } }] },
    { state: 'evidence', questions: [{ ...q, type: 'score', levels: [1, 2] }] },
  ]) {
    fs.writeFileSync(file, JSON.stringify(request));
    const r = aegis(dir, ['jev', 'judge', '--file', file], { env: { JEV_BACKEND: 'mock' } });
    assert.equal(r.status, 2, JSON.stringify(request) + r.stdout + r.stderr);
  }
});

test('audit: oversized question text cannot evade the judgment payload ceiling', (t) => {
  const dir = scratch(t);
  const file = path.join(dir, 'request.json');
  fs.writeFileSync(file, JSON.stringify({ state: 'small state', questions: [{ id: 'one', type: 'noul', question: 'x'.repeat(130000) }] }));
  const r = aegis(dir, ['jev', 'judge', '--file', file], { env: { JEV_BACKEND: 'mock' } });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /ESCALATE\(oversized\)/);
});

test('audit: an unavailable judgment backend cannot classify a review cycle as all-noise theater', (t) => {
  const dir = scratch(t);
  const file = path.join(dir, 'request.json');
  fs.writeFileSync(file, JSON.stringify({ state: 'evidence', items: [{ id: 'one', text: 'potential contract defect' }] }));
  const r = aegis(dir, ['jev', 'score', '--file', file], { env: { JEV_BACKEND: '', TYPESAFE_API_KEY: '' } });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /cycle: UNMEASURED/);
  assert.doesNotMatch(r.stdout, /cycle: THEATER/);
});
