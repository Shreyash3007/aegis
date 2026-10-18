// R5 executor-trial SETUP scaffold (v0.11 "Reach", W4-B).
//
// Walks a DISPOSABLE project from nothing to state 04a using the same
// synthetic-approval precedent as scripts/pilot.mjs: AEGIS_HUMAN_TOKEN=1 is
// used ONLY inside this disposable scratch repo (the pilot/audit pattern for
// disposable repositories) - it is never a posture for the aegis repository
// itself nor for any gate that matters. It then writes the frozen scaffold
// files (N1 greet contract, contract demo record, frozen acceptance
// criteria) and prints the executor-phase handoff.
//
// The setup is owner-run infrastructure, NOT the trial: R5's delivery must
// be produced by the owner-selected real executor - a script or mock cannot
// satisfy that slice (see docs/releases/v0.11/r5-executor-trial.md).
//
// Usage: node r5-trial-setup.mjs [--dir <empty dir>] [--cli <aegis cli.js>]
// Defaults: dir = fresh temp dir, cli = this repo's dist/cli.js.
// Exits nonzero on the first unexpected exit code (after printing the step
// table), so a broken scaffold is visible before any executor is spawned.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
const argVal = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const CLI = path.resolve(argVal('--cli') ?? path.join(ROOT, 'dist', 'cli.js'));
const dir = argVal('--dir')
  ? path.resolve(argVal('--dir'))
  : fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-r5-setup-'));

if (!fs.existsSync(CLI)) {
  console.error(`setup: CLI not found at ${CLI} - build the candidate first (npm run build) or pass --cli`);
  process.exit(1);
}
if (fs.existsSync(dir) && fs.readdirSync(dir).length > 0) {
  console.error(`setup: --dir ${dir} exists and is not empty - the scaffold needs an empty directory`);
  process.exit(1);
}

const env = { ...process.env };
for (const k of ['AEGIS_HUMAN_TOKEN', 'TYPESAFE_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'AEGIS_JUDGE_API_KEY', 'OPENROUTER_API_KEY', 'AI_GATEWAY_API_KEY']) delete env[k];
const TOKEN = { AEGIS_HUMAN_TOKEN: '1' };
const GIT_ID = ['-c', 'user.name=r5-setup', '-c', 'user.email=r5-setup@localhost', '-c', 'commit.gpgsign=false'];

const steps = [];
function sh(cwd, bin, binArgs, extraEnv = {}) {
  const r = spawnSync(bin, binArgs, { cwd, encoding: 'utf8', env: { ...env, ...extraEnv } });
  return { code: r.status ?? 1, out: `${r.stdout ?? ''}${r.stderr ?? ''}`.trim() };
}
function git(args) {
  const r = sh(dir, 'git', [...GIT_ID, ...args]);
  if (r.code !== 0) fail(`git ${args.join(' ')}`, r.out);
}
function step(note, args, want, extraEnv = {}) {
  const r = sh(dir, process.execPath, [CLI, ...args], extraEnv);
  const ok = r.code === want;
  steps.push({ note, cmd: `aegis ${args.join(' ')}`, want, got: r.code, ok, out: r.out.split('\n')[0] ?? '' });
  if (!ok) fail(note, r.out, want, r.code);
  return r;
}
function write(file, contents) {
  const p = path.join(dir, file);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, contents);
}
function table() {
  for (const s of steps) console.log(`  ${s.ok ? 'OK ' : 'FAIL'} [${s.got}] ${s.cmd}`);
}
function fail(what, out, want, got) {
  table();
  console.error(`setup FAILED at: ${what}${want === undefined ? '' : ` (wanted exit ${want}, got ${got})`}`);
  if (out) console.error(out);
  process.exit(1);
}

try {
  fs.mkdirSync(dir, { recursive: true });
  git(['init', '-q', '-b', 'main']);
  git(['commit', '-q', '--allow-empty', '-m', 'init']);
  step('bootstrap (greenfield defaults: strict quality profile)', ['init', '--yes'], 0);
  // N1: the tiny feature's contract, committed to main (same fixture shape as
  // scripts/pilot.mjs; the release candidate's contracts predicate is
  // satisfied before any lane exists).
  write('src/contracts/greet.ts', 'export function greet(name: string): string { return `hello ${name}`; }\n');
  git(['add', '.gitignore', 'brain', 'src/contracts/greet.ts']);
  git(['commit', '-q', '-m', 'N1: greet contract']);
  step('contracts merged (N1)', ['contracts'], 0);
  // discover -> architect -> plan, gates refused then synthetically approved
  for (const [to, gate] of [['00b', null], ['01a', null], ['01b', 'PRD'], ['01c', null], ['02a', null], ['02b', 'G1'], ['02c', null], ['03a', 'G2'], ['03b', null]]) {
    if (gate) step(`refused on ${gate}`, ['transition', to], 4);
    if (gate) step(`approve ${gate} (disposable-repo synthetic)`, ['gate', gate, '--approve'], 0, TOKEN);
    step(`walk -> ${to}`, ['transition', to], 0);
  }
  // demo gate: refusal, record, approval (non-UI contract demo)
  step('04a refused pre-demo', ['transition', '04a'], 4);
  write('docs/demo.md', '# greet\n\ncontracts: src/contracts/greet.ts\nsequence: greet -> greet\ntrace: greet("a") -> hello a\n');
  git(['add', 'docs/demo.md']);
  git(['commit', '-q', '-m', 'demo: contract demo artifact']);
  step('record demo (contract)', ['demo', 'record', '--kind', 'contract', '--file', 'docs/demo.md'], 0);
  step('approve DEMO (disposable-repo synthetic)', ['gate', 'DEMO', '--approve'], 0, TOKEN);
  step('lanes open -> 04a', ['transition', '04a'], 0);
  // Frozen acceptance criteria for the executor phase (frozen in the trial
  // document; committed here so the scaffold on main carries them).
  write('docs/r5-acceptance.json', JSON.stringify({
    criteria: [
      {
        id: 'AC1',
        statement: "greet trims surrounding whitespace and greets the name: greet('  Ada  ') === 'Hello, Ada!'",
        command: ['node', '--test', '--test-name-pattern', 'trims and greets the name', 'test/greet.test.mjs'],
      },
      {
        id: 'AC2',
        statement: "empty and whitespace-only input fall back to 'Hello, world!'",
        command: ['node', '--test', '--test-name-pattern', 'falls back to world', 'test/greet.test.mjs'],
      },
      {
        id: 'AC3',
        statement: 'non-string input throws TypeError',
        command: ['node', '--test', '--test-name-pattern', 'non-string input', 'test/greet.test.mjs'],
      },
    ],
  }, null, 2) + '\n');
  git(['add', 'docs/r5-acceptance.json']);
  git(['commit', '-q', '-m', 'scaffold: frozen R5 acceptance criteria']);
  // The scaffold must end clean (tracked + untracked; .aegis/ is ignored by
  // design): the executor phase starts from a repository with no stray work.
  const clean = sh(dir, 'git', [...GIT_ID, 'status', '--porcelain']);
  steps.push({ note: 'scaffold tree clean (no stray tracked/untracked work)', cmd: 'git status --porcelain', want: 0, got: clean.code, ok: clean.code === 0 && clean.out === '', out: clean.out });
  if (clean.code !== 0 || clean.out !== '') fail('scaffold left uncommitted changes', clean.out);
} catch (e) {
  fail(`unexpected error: ${e?.message ?? e}`, '');
}

table();
console.log('\nR5 SETUP READY');
console.log(`  trial repo : ${dir}`);
console.log(`  candidate  : ${CLI}`);
console.log('  executor phase begins at `aegis slice create greet-trial` inside the trial repo');
console.log('  run every `aegis` command from THIS repo root - never from the slice worktree');
console.log('  (follow docs/releases/v0.11/r5-executor-trial.md; keep the intervention log)');
