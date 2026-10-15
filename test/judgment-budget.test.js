import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { scratch, aegis, readState } from './helpers.js';

test('wave budget: batches reserve questions atomically; exhaustion parks before judging', (t) => {
  const dir = scratch(t);
  const plan = path.join(dir, 'questions.json');
  fs.writeFileSync(plan, JSON.stringify({ state: 'test evidence', questions: [
    { id: 'a', type: 'noul', question: 'is the evidence sufficient?' },
    { id: 'b', type: 'noul', question: 'is another check needed?' },
  ] }));
  assert.equal(aegis(dir, ['wave', '--budget', '3']).status, 0);
  const env = { JEV_BACKEND: 'mock', TYPESAFE_API_KEY: '' };
  assert.equal(aegis(dir, ['jev', 'judge', '--file', plan], { env }).status, 0);
  assert.equal(readState(dir).judgment_budget.used, 2);
  const parked = aegis(dir, ['jev', 'judge', '--file', plan], { env });
  assert.equal(parked.status, 5, parked.stdout + parked.stderr);
  assert.match(parked.stderr, /budget exhausted/);
  assert.equal(readState(dir).judgment_budget.used, 2, 'no partial batch charged');
  assert.equal(aegis(dir, ['wave', '--budget', '3']).status, 0);
  assert.equal(readState(dir).judgment_budget.used, 2, 'same budget does not reset consumption');
  assert.equal(aegis(dir, ['wave', '--budget', '100']).status, 4, 'cannot silently raise the active ceiling');
  assert.match(aegis(dir, ['status']).stdout, /judgment budget: 2\/3/);
  assert.equal(aegis(dir, ['wave', 'reset', '--reason', 'agent retry']).status, 7);
  assert.equal(aegis(dir, ['wave', 'reset', '--reason', 'reviewed by owner'], { env: { AEGIS_HUMAN_TOKEN: '1' } }).status, 0);
  assert.equal(readState(dir).judgment_budget.used, 0);
});

test('evidence export: measured facts and reported/unknown usage remain distinct, with no raw prompts', (t) => {
  const dir = scratch(t);
  assert.equal(aegis(dir, ['evidence', 'usage', '--model', 'user-chosen-model', '--tokens-in', '10', '--tokens-out', '3']).status, 0);
  const out = path.join(dir, '.aegis', 'release-evidence.json');
  const r = aegis(dir, ['evidence', 'export', '--file', out]);
  assert.equal(r.status, 0, r.stderr);
  const data = JSON.parse(fs.readFileSync(out, 'utf8'));
  assert.equal(data.usage.provenance, 'executor-reported (not independently verified)');
  assert.equal(data.usage.tokens_in, 10);
  assert.equal(data.usage.cost_usd, null);
  assert.equal(data.usage.cost_status, 'UNMEASURED');
  assert.ok(!JSON.stringify(data).includes('user-chosen-model'), 'public aggregate excludes model names/identifiers');
  assert.equal(aegis(dir, ['evidence', 'usage', '--tokens-in', '-1']).status, 2);
  assert.equal(aegis(dir, ['evidence', 'export', '--file', out]).status, 4, 'cannot overwrite an observation');
});
