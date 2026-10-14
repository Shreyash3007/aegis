// ast build on non-TypeScript repos: honest UNMEASURED, never faked.
// The module graph is ts-morph only; downstream skills must treat a missing
// graph as UNMEASURED, not as an empty (clean) graph.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scratch, aegis } from './helpers.js';

test('ast build with no TS sources: UNMEASURED exit 0, labeled', (t) => {
  const dir = scratch(t);
  const r = aegis(dir, ['ast', 'build']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /no-AST mode/);
  assert.match(r.stdout, /TypeScript-only/);
  assert.match(r.stdout, /UNMEASURED/);
});

test('ast diff without a stored graph exits 2', (t) => {
  const dir = scratch(t);
  const r = aegis(dir, ['ast', 'diff']);
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stderr, /no stored graph/);
});
