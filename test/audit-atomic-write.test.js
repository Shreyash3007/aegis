import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writeJ } from '../dist/lib/util.js';

test('audit: a preplanted predictable temporary hardlink cannot redirect a JSON write', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-atomic-audit-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const outside = path.join(root, 'outside-sentinel.txt');
  fs.writeFileSync(outside, 'owner content must remain unchanged');
  const target = path.join(root, 'state.json');
  const planted = `${target}.tmp-${process.pid}`;
  fs.linkSync(outside, planted);
  writeJ(target, { safe: true });
  assert.equal(fs.readFileSync(outside, 'utf8'), 'owner content must remain unchanged');
  assert.deepEqual(JSON.parse(fs.readFileSync(target, 'utf8')), { safe: true });
});
