import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { scratch, aegis } from './helpers.js';

test('audit: a plain JavaScript package is not mistaken for a configured TypeScript graph', (t) => {
  const dir = scratch(t);
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'plain-js', type: 'module' }));
  const bin = path.join(dir, 'node_modules', '.bin');
  fs.mkdirSync(bin, { recursive: true });
  fs.writeFileSync(path.join(bin, process.platform === 'win32' ? 'tsc.cmd' : 'tsc'),
    process.platform === 'win32' ? '@echo WRONG_CHECKER\r\n@exit /b 1\r\n' : '#!/bin/sh\necho WRONG_CHECKER\nexit 1\n', { mode: 0o755 });
  const r = aegis(dir, ['typecheck']);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /UNMEASURED/);
  assert.doesNotMatch(r.stdout + r.stderr, /WRONG_CHECKER/);
});
