// Multi-stack typecheck oracle: detectStack + typecheckCommand power the
// `aegis typecheck` command, the contracts validate suite, the merge oracle and
// the pre-commit hook. On a non-TS repo Aegis must use the RIGHT checker or
// degrade honestly (UNMEASURED) - never fake a pass, never hard-fail because the
// wrong toolchain is missing. Hermetic: tsc resolves from this repo's
// node_modules/.bin (on PATH under `npm test`); go/cargo are simply absent here,
// which exercises the UNMEASURED path for real.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { scratch, gitIn, aegis } from './helpers.js';

const GIT_IDENTITY = ['-c', 'user.email=aegis-test@example.com', '-c', 'user.name=aegis-test'];

// (a) No stack markers at all -> unknown stack -> honest UNMEASURED, exit 0.
test('typecheck: scratch repo with no stack markers -> UNMEASURED naming unknown, exit 0', (t) => {
  const dir = scratch(t); // aegis init writes no tsconfig/package.json/Cargo.toml/go.mod
  const r = aegis(dir, ['typecheck']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /typecheck: UNMEASURED/);
  assert.match(r.stdout, /stack=unknown/);
  assert.match(r.stdout, /no recognized stack markers/);
});

// (b) TS repo, a deliberate type error, no LOCAL typescript. Honest either way:
// a tsc found on PATH -> FAIL exit 9 (names the error); no tsc anywhere ->
// UNMEASURED exit 0 (names the cause). Asserts the output honestly names which.
test('typecheck: TS repo with a type error, no local tsc -> honest FAIL(9) or UNMEASURED(0)', (t) => {
  const dir = scratch(t);
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'scratch', private: true }) + '\n');
  fs.writeFileSync(path.join(dir, 'tsconfig.json'), JSON.stringify({
    compilerOptions: { strict: true, noEmit: true, target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext' },
    include: ['src'],
  }) + '\n');
  fs.mkdirSync(path.join(dir, 'src'));
  fs.writeFileSync(path.join(dir, 'src', 'bad.ts'), 'export const n: number = "not a number";\n');
  gitIn(dir, ['add', 'package.json', 'tsconfig.json', 'src']);
  gitIn(dir, ['commit', '-q', '--no-verify', '-m', 'bad ts']);
  const r = aegis(dir, ['typecheck']);
  if (r.status === 9) {
    // a tsc was found on PATH and ran -> real compiler diagnostic surfaces
    assert.match(r.stderr, /typecheck: FAIL/);
    assert.match(r.stderr, /TS2322/);
  } else {
    // no tsc anywhere -> honest UNMEASURED naming the cause (never a fake pass)
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /typecheck: UNMEASURED/);
    assert.match(r.stdout, /stack=typescript/);
    assert.match(r.stdout, /typescript toolchain not found on PATH/);
  }
});

// (c) Go repo (go.mod + main.go). If go is installed -> go vet (exit 0 or 9); if
// not -> UNMEASURED exit 0. Either way the wording honestly names the go stack.
test('typecheck: go repo (go.mod + main.go) -> exit 0|9, wording names go', (t) => {
  const dir = scratch(t);
  fs.writeFileSync(path.join(dir, 'go.mod'), 'module x\n\ngo 1.21\n');
  fs.mkdirSync(path.join(dir, 'cmd', 'x'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'cmd', 'x', 'main.go'),
    'package main\n\nimport "fmt"\n\nfunc main() { fmt.Println("hi") }\n');
  gitIn(dir, ['add', 'go.mod', 'cmd']);
  gitIn(dir, ['commit', '-q', '--no-verify', '-m', 'go module']);
  const r = aegis(dir, ['typecheck']);
  assert.ok(r.status === 0 || r.status === 9, `unexpected status ${r.status}: ${r.stdout}\n${r.stderr}`);
  assert.match(`${r.stdout}\n${r.stderr}`, /go/);
});

// (d) Regression vs the old inline tsconfig/tsc block: a fresh init with no
// source files must still let the first commit through (the hook now calls
// `aegis typecheck`, which degrades honestly instead of running tsc into
// TS18003 "No inputs were found").
test('pre-commit hook on fresh init still passes with no source files', (t) => {
  const dir = scratch(t); // git repo + aegis init --yes (hooks installed)
  fs.writeFileSync(path.join(dir, 'README.md'), '# fresh project\n');
  gitIn(dir, ['add', 'README.md']);
  const r = spawnSync('git', [...GIT_IDENTITY, 'commit', '-m', 'fresh'],
    { cwd: dir, encoding: 'utf8' });
  assert.equal(r.status, 0, `stdout: ${r.stdout}\nstderr: ${r.stderr}`);
});
