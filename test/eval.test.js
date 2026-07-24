// Eval harness: phantom command references fail (exit 11); stock skills pass.
import { test } from 'node:test';
import assert from 'node:assert/strict';
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

test('eval: a skill file referencing a phantom command fails (exit 11)', (t) => {
  const dir = scratch(t);
  const file = path.join(dir, 'phantom.md');
  const body = SECTIONS.map((s) => `${s}\n\ncontent`).join('\n\n');
  fs.writeFileSync(file, `# SKILL-99z: PHANTOM\n\n${body}\n\nRun \`aegis warp\` to engage.\n`);
  const r = aegis(dir, ['eval', file]);
  assert.equal(r.status, 11);
  assert.match(r.stdout, /FAIL phantom\.md/);
  assert.match(r.stdout, /cli-refs-exist: warp/);
});

test('eval --all: the stock skills pass (68/68)', (t) => {
  const dir = scratch(t);
  const r = aegis(dir, ['eval', '--all']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /eval: 68\/68 passed/);
});
