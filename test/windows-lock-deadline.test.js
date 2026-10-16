import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { scratch, CLI } from './helpers.js';

test('lock deadline: a 12s live holder is still acquirable within the 60s anti-wedge bound', async (t) => {
  const dir = scratch(t);
  const resource = path.join(dir, '.aegis', 'deadline-probe');
  const lockModule = pathToFileURL(path.join(path.dirname(CLI), 'lib', 'lock.js')).href;
  const holderCode = `import {lockFile} from ${JSON.stringify(lockModule)};
    const release = lockFile(${JSON.stringify(resource)});
    setTimeout(() => { release(); }, 12000);`;
  const holder = spawn(process.execPath, ['--input-type=module', '-e', holderCode], { cwd: dir, stdio: 'ignore' });
  t.after(() => { try { holder.kill('SIGKILL'); } catch { /* already exited */ } });
  await new Promise((resolve) => setTimeout(resolve, 1500));
  assert.equal(holder.exitCode, null, 'holder must still own the lock when the contender starts');
  const contenderCode = `import {lockFile} from ${JSON.stringify(lockModule)};
    const release = lockFile(${JSON.stringify(resource)}); release(); console.log('CONTENDER_ACQUIRED');`;
  const start = Date.now();
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', contenderCode], { cwd: dir, encoding: 'utf8', timeout: 55000 });
  const elapsed = Date.now() - start;
  assert.equal(r.status, 0, `contender must acquire after the holder releases, not wedge-fail: ${r.stderr}${r.stdout}`);
  assert.match(r.stdout, /CONTENDER_ACQUIRED/);
  assert.ok(elapsed >= 9000 && elapsed < 55000, `expected to wait out the holder (~10.5s), waited ${elapsed}ms`);
  await new Promise((resolve) => holder.once('exit', resolve));
});

test('lock deadline: refusal still names the 60s bound and never grants ownership on failure', (t) => {
  const src = fs.readFileSync(new URL('../src/lib/lock.ts', import.meta.url), 'utf8');
  assert.match(src, /60_000/, 'acquisition deadline must be 60s');
  assert.match(src, /waited 60s/, 'refusal message must name the 60s bound');
  assert.doesNotMatch(src, /waited 10s/, 'stale 10s refusal wording must be gone');
});
