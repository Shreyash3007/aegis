import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { scratch, aegis, CLI } from './helpers.js';

test('audit: npm operational errors cannot become a clean dependency audit', (t) => {
  const dir = scratch(t);
  fs.writeFileSync(path.join(dir, 'package-lock.json'), '{}');
  const bin = path.join(dir, 'fake-bin');
  fs.mkdirSync(bin);
  const body = JSON.stringify({ error: { code: 'EAUDIT', summary: 'audit endpoint unavailable' } });
  if (process.platform === 'win32') {
    fs.writeFileSync(path.join(bin, 'npm.cmd'), `@echo ${body}\r\n@exit /b 1\r\n`);
  } else {
    fs.writeFileSync(path.join(bin, 'npm'), `#!/bin/sh\nprintf '%s\\n' '${body}'\nexit 1\n`, { mode: 0o755 });
  }
  const r = aegis(dir, ['validate', 'deps'], { env: { PATH: `${bin}${path.delimiter}${process.env.PATH}` } });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /UNMEASURED/);
  assert.doesNotMatch(r.stdout, /deps: PASS/);
});

test('audit: an empty monitor registry is not a healthy zero-check monitoring run', (t) => {
  const dir = scratch(t);
  fs.writeFileSync(path.join(dir, '.aegis', 'monitor-targets.json'), '[]');
  const r = aegis(dir, ['monitor', '--once']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /UNMEASURED/);
  assert.doesNotMatch(r.stdout, /HEALTHY/);
});

test('audit: malformed monitor thresholds and credential-bearing URLs are refused', (t) => {
  const dir = scratch(t);
  fs.writeFileSync(path.join(dir, '.aegis', 'monitor-targets.json'), JSON.stringify([{ url: 'http://127.0.0.1:1', benchmark_ms: -1 }]));
  assert.equal(aegis(dir, ['monitor', '--once']).status, 2);
  fs.writeFileSync(path.join(dir, '.aegis', 'monitor-targets.json'), '[]');
  assert.equal(aegis(dir, ['monitor', 'target', 'add', 'http://user:password@example.com/health']).status, 2);
});

test('audit: installed hooks can execute the baked fallback CLI from a path with spaces', (t) => {
  const dir = scratch(t);
  const fake = path.join(dir, 'installed tools', 'cli.mjs');
  fs.mkdirSync(path.dirname(fake));
  fs.writeFileSync(fake, "if(process.argv[2]==='--version')console.log('aegis 0.9.0');else console.log('FALLBACK_OK '+process.argv[2]);\n");
  const hookFile = path.join(dir, '.git', 'hooks', 'pre-commit');
  const original = fs.readFileSync(hookFile, 'utf8');
  assert.ok(original.includes(CLI), 'fixture replaces the actual baked path');
  const hook = original.replaceAll(CLI, fake).replace('if command -v aegis >/dev/null 2>&1;', 'if false;');
  fs.writeFileSync(hookFile, hook);
  const bash = process.platform === 'win32'
    ? path.join(process.env.ProgramFiles ?? 'C:\\Program Files', 'Git', 'bin', 'bash.exe') : 'bash';
  const r = spawnSync(bash, [hookFile], { cwd: dir, encoding: 'utf8', timeout: 10000 });
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /FALLBACK_OK checkpoint/);
  assert.match(r.stdout, /FALLBACK_OK typecheck/);
});

test('audit: contract validation runs the available local compiler instead of skipping its Windows shim', (t) => {
  const dir = scratch(t);
  fs.mkdirSync(path.join(dir, 'src', 'contracts'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'contracts', 'bad.ts'), 'export const bad: number = "wrong";\n');
  fs.writeFileSync(path.join(dir, 'package.json'), '{}');
  const bin = path.join(dir, 'node_modules', '.bin');
  fs.mkdirSync(bin, { recursive: true });
  const command = process.platform === 'win32' ? 'tsc.cmd' : 'tsc';
  const script = process.platform === 'win32'
    ? '@echo LOCAL_COMPILER_RAN\r\n@exit /b 1\r\n'
    : '#!/bin/sh\necho LOCAL_COMPILER_RAN\nexit 1\n';
  fs.writeFileSync(path.join(bin, command), script, { mode: 0o755 });
  const r = aegis(dir, ['validate', 'contracts']);
  assert.equal(r.status, 9, r.stderr + r.stdout);
  assert.match(r.stderr + r.stdout, /LOCAL_COMPILER_RAN/);
});

test('audit: invalid performance budgets are refused rather than silently passing comparisons', (t) => {
  const dir = scratch(t);
  fs.mkdirSync(path.join(dir, 'dist'));
  fs.writeFileSync(path.join(dir, 'dist', 'app.js'), 'x'.repeat(2048));
  fs.writeFileSync(path.join(dir, '.aegis', 'perf-budgets.json'), JSON.stringify({ bundle_kb: 'not-a-number' }));
  assert.equal(aegis(dir, ['validate', 'perf']).status, 2);
});
