// Eval harness: phantom command references fail (exit 11); stock skills pass.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { scratch, aegis, REPO_ROOT } from './helpers.js';

// Minimal Margin Format file: valid frontmatter + body order, one phantom CLI ref.
const PHANTOM = `---
name: 99z-phantom
version: 0.6.0
triggers: [phantom trigger xyz]
not-triggers: [real commands]
inputs: [nothing]
outputs: [nothing]
chains-to: nowhere
autonomy: L1
tokens-budget: 100
---
# SKILL-99z: PHANTOM

## Overview
A phantom skill for the eval harness.

## When
Always in tests.

## When-NOT
Never in production.

## Process
- Engage the warp drive: \`aegis warp\`

## Verification
- Exit code observed.

## Red Flags
- None.

## Interactions
- CLI: \`aegis warp\`.
- Next: nowhere.
`;

test('eval: a skill file referencing a phantom command fails (exit 11)', (t) => {
  const dir = scratch(t);
  const file = path.join(dir, 'phantom.md');
  fs.writeFileSync(file, PHANTOM);
  const r = aegis(dir, ['eval', file]);
  assert.equal(r.status, 11);
  assert.match(r.stdout, /FAIL phantom\.md/);
  assert.match(r.stdout, /cli-refs-exist: warp/);
});

test('eval --all: every shipped skill/reference passes', (t) => {
  const dir = scratch(t);
  const r = aegis(dir, ['eval', '--all']);
  assert.equal(r.status, 0, r.stderr);
  const count = fs.readdirSync(path.join(REPO_ROOT, 'skills'), { recursive: true })
    .filter((f) => f.endsWith('.md')).length;
  assert.ok(count >= 68, 'includes the established corpus');
  assert.ok(r.stdout.includes(`eval: ${count}/${count} passed`), r.stdout);
});
