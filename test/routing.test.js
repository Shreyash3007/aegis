import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const routing = JSON.parse(fs.readFileSync(path.join(ROOT, 'skills', 'routing.json'), 'utf8'));

// Phase ids must resolve to real phase dirs under skills/.
const phaseDirs = new Set(
  fs.readdirSync(path.join(ROOT, 'skills'), { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d{2}-/.test(d.name))
    .map((d) => d.name.slice(0, 2)),
);

test('routing: every blade phase resolves (or is the judgment-ring / prototype track)', () => {
  for (const b of routing.blades) {
    const okPhase = b.phase === 'judgment-ring' || b.phase === 'prototype' ||
      phaseDirs.has(b.phase.slice(0, 2));
    assert.ok(okPhase, `${b.name}: unknown phase ${b.phase}`);
  }
});

test('routing: chain types are thin|thick only', () => {
  for (const b of routing.blades) {
    assert.ok(['thin', 'thick'].includes(b.chain), `${b.name}: bad chain ${b.chain}`);
  }
});

test('routing: no trigger string is claimed by two blades', () => {
  const seen = new Map();
  for (const b of routing.blades) {
    for (const t of b.triggers || []) {
      const k = t.toLowerCase();
      assert.ok(!seen.has(k), `trigger collision: "${t}" claimed by ${seen.get(k)} and ${b.name}`);
      seen.set(k, b.name);
    }
  }
});

test('routing: missing blades all carry a fallback', () => {
  for (const m of routing.missing_with_fallback || []) {
    assert.ok(typeof m.fallback === 'string' && m.fallback.length > 10, `${m.name}: no fallback`);
  }
});

test('routing: blade names are unique', () => {
  const names = routing.blades.map((b) => b.name);
  assert.equal(new Set(names).size, names.length, 'duplicate blade name');
});
