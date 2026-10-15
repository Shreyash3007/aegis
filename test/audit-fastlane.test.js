import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { scratch, aegis, readState, CLI } from './helpers.js';

test('audit: fast-lane validation does not hold the state lease across child Aegis commands', (t) => {
  const dir = scratch(t);
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ scripts: { test: 'node inside-test.cjs' } }));
  fs.writeFileSync(path.join(dir, 'inside-test.cjs'),
    `const r=require('node:child_process').spawnSync(process.execPath,[${JSON.stringify(CLI)},'chore','inside-test'],{stdio:'inherit'});process.exit(r.status??1);`);
  assert.equal(aegis(dir, ['fix', 'start', 'repair a caption']).status, 0);
  const r = aegis(dir, ['fix', 'done']);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const s = readState(dir);
  assert.equal(s.fix.active, null);
  assert.ok(s.history.some((h) => h.event?.startsWith('chore: inside-test')));
});
