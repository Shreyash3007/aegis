// Merge oracle (N3): real git merge + tsc typecheck + contract diff in a
// throwaway worktree. Exit 0 = pass, 9 = refused with diagnostics,
// 13 = nothing to merge (never reported as a pass, A1.6).
//
// Hermetic toolchain, zero network: the scratch project's node_modules
// symlinks the Aegis repo's own TypeScript install and vendors a tiny fake
// "is-number" dependency with a hand-written .d.ts, so the oracle's tsc
// resolves a real third-party import. (Chosen over `npm install is-number`
// to keep the suite offline, fast and deterministic.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, scratch, aegis, gitIn } from './helpers.js';

const TYPESCRIPT = path.join(REPO_ROOT, 'node_modules', 'typescript');

function setupTsProject(t) {
  const dir = scratch(t);
  const nm = path.join(dir, 'node_modules');
  fs.mkdirSync(path.join(nm, '.bin'), { recursive: true });
  fs.symlinkSync(TYPESCRIPT, path.join(nm, 'typescript'), 'junction');
  fs.symlinkSync(path.join('..', 'typescript', 'bin', 'tsc'), path.join(nm, '.bin', 'tsc'), 'junction');
  const dep = path.join(nm, 'is-number');
  fs.mkdirSync(dep);
  fs.writeFileSync(path.join(dep, 'package.json'), JSON.stringify({
    name: 'is-number', version: '1.0.0', type: 'module', main: './index.js', types: './index.d.ts',
  }) + '\n');
  fs.writeFileSync(path.join(dep, 'index.js'),
    'export default function isNumber(n) { return typeof n === "number" && Number.isFinite(n); }\n');
  fs.writeFileSync(path.join(dep, 'index.d.ts'),
    'declare function isNumber(n: unknown): n is number;\nexport default isNumber;\n');
  fs.writeFileSync(path.join(dir, 'package.json'),
    JSON.stringify({ name: 'scratch', private: true, type: 'module' }) + '\n');
  fs.writeFileSync(path.join(dir, 'tsconfig.json'), JSON.stringify({
    compilerOptions: { strict: true, target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext', noEmit: true },
    include: ['src'],
  }) + '\n');
  fs.mkdirSync(path.join(dir, 'src'));
  fs.writeFileSync(path.join(dir, 'src', 'index.ts'), 'export const x: number = 1;\n');
  fs.appendFileSync(path.join(dir, '.gitignore'), 'node_modules/\n');
  // --no-verify: the aegis pre-commit hook would typecheck the repo; the merge
  // oracle under test does its own typecheck, and 'broken' must be committable.
  gitIn(dir, ['add', '.gitignore', 'package.json', 'tsconfig.json', 'src']);
  gitIn(dir, ['commit', '-q', '--no-verify', '-m', 'ts project']);
  return dir;
}

function branchWith(t, dir, branch, file, contents) {
  gitIn(dir, ['checkout', '-q', '-b', branch]);
  fs.writeFileSync(path.join(dir, 'src', file), contents);
  gitIn(dir, ['add', `src/${file}`]);
  gitIn(dir, ['commit', '-q', '--no-verify', '-m', `add ${file}`]);
  gitIn(dir, ['checkout', '-q', 'main']);
}

test('merge oracle: valid branch passes (exit 0)', (t) => {
  const dir = setupTsProject(t);
  branchWith(t, dir, 'good', 'util.ts',
    "import isNumber from 'is-number';\nexport const pick = (n: unknown): number => (isNumber(n) ? n : 0);\n");
  const r = aegis(dir, ['merge', 'check', 'good']);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /merge oracle PASSED good/);
});

test('merge oracle: branch with a type error refused (exit 9) with diagnostics', (t) => {
  const dir = setupTsProject(t);
  branchWith(t, dir, 'broken', 'bad.ts', 'export const n: number = "not a number";\n');
  const r = aegis(dir, ['merge', 'check', 'broken']);
  assert.equal(r.status, 9);
  assert.match(r.stderr, /MERGE ORACLE REFUSED broken/);
  assert.match(r.stderr, /tsc --noEmit FAILED/);
  assert.match(r.stderr, /TS2322/); // real compiler diagnostic surfaces
});

test('merge oracle: no changes vs base is exit 13, never a pass (A1.6)', (t) => {
  const dir = setupTsProject(t);
  gitIn(dir, ['branch', 'same']); // points at main's tip
  const r = aegis(dir, ['merge', 'check', 'same']);
  assert.equal(r.status, 13);
  assert.match(r.stdout, /NOTHING TO MERGE/);
  assert.match(r.stdout, /NOT a pass/);
});
