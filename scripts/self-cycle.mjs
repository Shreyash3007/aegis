// v0.10 self-conformance exercise. Real git/worktrees/tests; synthetic gate
// approvals only inside a disposable repo. Never modifies the host's pipeline.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLI = path.join(ROOT, 'dist', 'cli.js');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-self-cycle-'));
const events = [];
const si = process.argv.indexOf('--superpowers-root');
const upstream = si >= 0 ? process.argv[si + 1] : undefined;
if (si >= 0 && !upstream) throw new Error('--superpowers-root needs a pinned checkout path');
const env = { ...process.env, JEV_BACKEND: 'mock' };
for (const k of ['AEGIS_HUMAN_TOKEN', 'TYPESAFE_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'AEGIS_JUDGE_API_KEY']) delete env[k];
const write = (root, f, s) => { const p = path.join(root, f); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); };
function git(root, ...args) {
  const r = spawnSync('git', ['-c', 'user.name=aegis-test-fixture', '-c', 'user.email=fixture@invalid', ...args], { cwd: root, env, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`fixture git failed: ${args[0]} (exit ${r.status})`);
  return r.stdout.trim();
}
function run(expected, ...args) {
  const tokenFixture = args[0] === 'gate';
  const r = spawnSync(process.execPath, [CLI, ...args], {
    cwd: dir, env: { ...env, ...(tokenFixture ? { AEGIS_HUMAN_TOKEN: 'test-fixture' } : {}) },
    encoding: 'utf8', timeout: 150_000, maxBuffer: 8 * 1024 * 1024,
  });
  const output = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  events.push({ command: args[0], operation: args[1] ?? null, expected_exit: expected, observed_exit: r.status, pass: r.status === expected && !r.error,
    output_sha256: crypto.createHash('sha256').update(output).digest('hex'), approval_fixture: tokenFixture });
  if (r.status !== expected || r.error) throw new Error(`self-cycle ${args[0]} ${args[1] ?? ''}: expected ${expected}, got ${r.status}: ${output.slice(0, 250)}`);
  return output;
}
let failed;
try {
  git(dir, 'init', '-q', '-b', 'main');
  write(dir, 'README.md', '# disposable conformance project\n');
  git(dir, 'add', 'README.md'); git(dir, 'commit', '-qm', 'initial fixture');
  run(0, 'init', '--yes');
  for (const name of ['brainstorming', 'test-driven-development', 'systematic-debugging', 'requesting-code-review', 'using-git-worktrees', 'verification-before-completion']) {
    const resolved = run(0, 'blade', 'resolve', name, ...(upstream ? ['--root', upstream] : []));
    if (upstream && !resolved.includes('blade VERIFIED:')) throw new Error(`pinned source mismatch: ${name}`);
  }
  write(dir, 'src/contracts/increment.cjs', 'module.exports = { input: "number", output: "input + 1" };\n');
  write(dir, 'src/increment.cjs', 'module.exports = (n) => n;\n');
  write(dir, 'docs/demo.md', '# Increment contract\n\nInput: number.\nOutput: input + 1.\nSequence: receive -> increment -> return.\nTrace: 1 -> 2.\nSource: src/contracts/increment.cjs\n');
  git(dir, 'add', '.gitignore', 'brain', 'src', 'docs'); git(dir, 'commit', '-qm', 'contracts and scaffold on base');
  run(0, 'contracts'); // local-only PR verification is explicitly UNVERIFIED
  for (const [to, gate] of [['00b'], ['01a'], ['01b', 'PRD'], ['01c'], ['02a'], ['02b', 'G1'], ['02c'], ['03a', 'G2'], ['03b']]) {
    if (gate) { run(4, 'transition', to); run(0, 'gate', gate, '--approve', '--evidence', 'synthetic test fixture'); }
    run(0, 'transition', to);
  }
  run(4, 'transition', '04a');
  run(0, 'demo', 'record', '--kind', 'contract', '--file', 'docs/demo.md');
  run(0, 'gate', 'DEMO', '--approve', '--evidence', 'synthetic prototype fixture');
  run(0, 'transition', '04a');
  run(0, 'slice', 'create', 'increment');
  const branch = 'aegis/slice-increment';
  const wt = path.join(`${dir}-worktrees`, 'increment');
  write(wt, 'test/check.cjs', "const a=require('node:assert/strict'); const inc=require('../src/increment.cjs'); a.equal(inc(1),2); a.equal(inc(-1),0);\n");
  write(wt, 'acceptance.json', JSON.stringify({ criteria: [{ id: 'AC1', statement: 'increments positive and negative values', command: [process.execPath, 'test/check.cjs'] }] }));
  write(wt, 'review.json', JSON.stringify({ findings: [{ id: 'F1', severity: 'major', status: 'open', evidence: ['src/increment.cjs'], summary: 'fixture: missing increment' }] }));
  git(wt, 'add', 'test/check.cjs', 'acceptance.json', 'review.json'); git(wt, 'commit', '-qm', 'failing regression and acceptance plan');
  run(0, 'tdd', 'red', branch, '--test-file', 'test/check.cjs', '--expect-exit', '1', '--', process.execPath, 'test/check.cjs');
  run(9, 'quality', 'review', branch, '--file', 'review.json');
  run(9, 'merge', 'check', branch);
  write(wt, 'src/increment.cjs', 'module.exports = (n) => n + 1;\n');
  write(wt, 'review.json', JSON.stringify({ findings: [{ id: 'F1', severity: 'major', status: 'resolved', evidence: ['src/increment.cjs'], summary: 'fixture: assertion now passes' }] }));
  git(wt, 'add', 'src/increment.cjs', 'review.json'); git(wt, 'commit', '-qm', 'minimal fix and review disposition');
  run(0, 'tdd', 'green', branch);
  run(0, 'quality', 'review', branch, '--file', 'review.json');
  run(0, 'quality', 'acceptance', branch, '--file', 'acceptance.json');
  run(0, 'clean', branch, '--require-proof', '--require-quality');
  git(dir, 'merge', '--no-ff', branch, '-m', 'actual fixture merge after evidence checks');
  run(0, 'slice', 'remove', 'increment');
  run(0, 'transition', '04b'); run(0, 'transition', '04c');
  run(4, 'transition', '05a'); run(0, 'gate', 'G3', '--approve', '--evidence', 'synthetic integration fixture');
  for (const to of ['05a', '05b', '05c', '05d', '05e', '06b', '07a', '07b', '07c', '08a']) run(0, 'transition', to);
  // A merge commit is a new snapshot: recapture both quality receipts on main.
  run(0, 'quality', 'acceptance', 'main', '--file', 'acceptance.json');
  run(0, 'quality', 'review', 'main', '--file', 'review.json');
  run(4, 'transition', '08b', '--require-quality');
  run(0, 'gate', 'G4', '--approve', '--evidence', 'synthetic ship fixture, not product approval');
  run(0, 'transition', '08b', '--require-quality');
  run(0, 'wave', '--budget', '1');
  // Wave writes a tracked view; commit it before subsequent snapshot checks.
  git(dir, 'add', 'brain/wave-prompt.md'); git(dir, 'commit', '-qm', 'fixture wave snapshot');
  write(dir, '.aegis/question.json', JSON.stringify({ state: 'fixture', questions: [{ id: 'one', type: 'noul', question: 'is there evidence?' }] }));
  run(0, 'jev', 'judge', '--file', '.aegis/question.json');
  run(5, 'jev', 'judge', '--file', '.aegis/question.json');
  run(0, 'evidence', 'export', '--file', '.aegis/public-aggregate.json');
  run(0, 'checkpoint'); run(0, 'resume');
} catch (e) { failed = String(e); }
const report = {
  schema_version: 1, version_under_test: JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version,
  host_source_commit: git(ROOT, 'rev-parse', 'HEAD'), events,
  host_source_dirty: git(ROOT, 'status', '--porcelain') !== '',
  blade_source_check: upstream ? 'six pinned source blobs verified' : 'native fallback permitted; upstream execution not asserted',
  passed: !failed && events.every((e) => e.pass), ...(failed ? { failure: failed } : {}),
  limitations: ['Synthetic gate approvals in a disposable repository; not independent human sign-off.', 'Source resolution verifies bytes, not executor skill compliance.', 'No model comparison, end-user validation or completed case study.', 'No provider credentials needed; judgment backend is mock.'],
};
const outputDir = path.join(ROOT, '.aegis', 'self-cycle');
fs.mkdirSync(outputDir, { recursive: true });
const file = path.join(outputDir, `${crypto.randomUUID()}.json`);
fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n');
console.log(`self-cycle: ${events.filter((e) => e.pass).length}/${events.length} expected outcomes; ${failed ? 'FAILED' : 'PASSED'}; receipt ${file}`);
if (failed) console.error(failed);
// Keep scratch evidence on failure; successful fixture trees contain only
// this runner's committed work and are removed using git's worktree cleanup.
if (!failed) { git(dir, 'worktree', 'prune'); fs.rmSync(dir, { recursive: true, force: true }); }
process.exitCode = failed ? 1 : 0;
