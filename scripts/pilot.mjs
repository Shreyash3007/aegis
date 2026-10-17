// Scripted pipeline smoke (not a small-model executor pilot):
// walk a scratch repo 00a -> 08b shipping a tiny feature with NO provider
// credentials in the environment and no network calls in any role.
// Judgment roles run JEV_BACKEND=mock (free path, deterministic); the
// executor is a deterministic Node script. No model follows skills here.
// This does not establish small-model quality, effectiveness, or cost.
// Writes a unique local report, or --output <new-path>.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeReport } from './lib/report-output.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLI = path.join(REPO_ROOT, 'dist', 'cli.js');
const VERSION = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')).version;
const GIT_ID = ['-c', 'user.email=aegis-pilot@example.com', '-c', 'user.name=aegis-pilot'];
const TOKEN = { AEGIS_HUMAN_TOKEN: '1' };

// Scrub every provider credential: a pilot that can phone a frontier
// proves nothing about the free path.
const SCRUBBED = [
  'TYPESAFE_API_KEY', 'AEGIS_JUDGE_API_KEY', 'AEGIS_JUDGE_URL', 'AEGIS_JUDGE_MODEL',
  'OPENROUTER_API_KEY', 'AI_GATEWAY_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY',
];
const CLEAN_ENV = { ...process.env, JEV_BACKEND: 'mock' };
for (const k of SCRUBBED) delete CLEAN_ENV[k];

const steps = [];
function sh(dir, bin, args, env = {}) {
  const r = spawnSync(bin, args, { cwd: dir, encoding: 'utf8', env: { ...CLEAN_ENV, ...env } });
  return { code: r.status ?? 1, out: `${r.stdout ?? ''}${r.stderr ?? ''}`.trim() };
}
function git(dir, args) {
  const r = sh(dir, 'git', [...GIT_ID, ...args]);
  if (r.code !== 0) throw new Error(`setup git failed: ${args.join(' ')}: ${r.out.slice(0, 200)}`);
}
function step(note, dir, args, want, env = {}) {
  const r = sh(dir, process.execPath, [CLI, ...args], env);
  const ok = r.code === want;
  steps.push({ note, cmd: `aegis ${args.join(' ')}`, want, got: r.code, ok, out: r.out.split('\n')[0].slice(0, 160) });
  return r;
}
function write(dir, file, contents) {
  const p = path.join(dir, file);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, contents);
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-pilot-'));
git(dir, ['init', '-q', '-b', 'main']);
git(dir, ['commit', '-q', '--allow-empty', '-m', 'init']);

step('bootstrap', dir, ['init', '--yes'], 0);
// v0.11 R1: greenfield init defaults strict; the pilot witnesses the state
// walk, gates and lane machinery (self-cycle runs the full strict evidence
// walk), so it opts into legacy explicitly.
step('legacy quality profile (evidence walk belongs to self-cycle)', dir, ['config', 'set', 'quality_profile', 'legacy'], 0);
// N1: the tiny feature's contract, committed to main
write(dir, 'src/contracts/greet.ts', 'export function greet(name: string): string { return `hello ${name}`; }\n');
git(dir, ['add', '.gitignore', 'brain', 'src/contracts/greet.ts']);
git(dir, ['commit', '-q', '-m', 'N1: greet contract']);
step('contracts merged', dir, ['contracts'], 0);
// discover -> architect -> plan
for (const [to, gate] of [['00b', null], ['01a', null], ['01b', 'PRD'], ['01c', null], ['02a', null], ['02b', 'G1'], ['02c', null], ['03a', 'G2'], ['03b', null]]) {
  if (gate) step(`refused on ${gate}`, dir, ['transition', to], 4);
  if (gate) step(`human approves ${gate}`, dir, ['gate', gate, '--approve'], 0, TOKEN);
  step(`walk -> ${to}`, dir, ['transition', to], 0);
}
// demo gate: refusal, record, approval (non-UI contract demo)
step('04a refused pre-demo', dir, ['transition', '04a'], 4);
write(dir, 'docs/demo.md', '# greet\n\ncontracts: src/contracts/greet.ts\nsequence: greet -> greet\ntrace: greet("a") -> hello a\n');
step('record demo', dir, ['demo', 'record', '--kind', 'contract', '--file', 'docs/demo.md'], 0);
step('approve DEMO', dir, ['gate', 'DEMO', '--approve'], 0, TOKEN);
step('lanes open', dir, ['transition', '04a'], 0);
// build the slice for real, through the oracle (work happens INSIDE the
// slice worktree - the branch is already checked out there by create)
step('spawn lane', dir, ['slice', 'create', 'greet'], 0);
const wt = path.join(path.dirname(dir), `${path.basename(dir)}-worktrees`, 'greet');
write(wt, 'src/greet-impl.ts', "import { greet } from './contracts/greet.js';\nexport const out = greet('world');\n");
git(wt, ['add', 'src/greet-impl.ts']);
git(wt, ['commit', '-q', '-m', 'slice: greet impl']);
step('clean PASS', dir, ['clean', 'aegis/slice-greet'], 0);
git(dir, ['merge', '--no-ff', 'aegis/slice-greet', '-m', 'merge smoke fixture after oracle verification']);
step('close merged slice', dir, ['slice', 'remove', 'greet'], 0);
step('04b', dir, ['transition', '04b'], 0);
step('04c', dir, ['transition', '04c'], 0);
step('refused on G3', dir, ['transition', '05a'], 4);
step('human approves G3', dir, ['gate', 'G3', '--approve'], 0, TOKEN);
for (const to of ['05a', '05b', '05c', '05d', '05e', '06b', '07a', '07b', '07c', '08a']) step(`walk -> ${to}`, dir, ['transition', to], 0);
step('refused on G4', dir, ['transition', '08b'], 4);
step('human approves G4', dir, ['gate', 'G4', '--approve'], 0, TOKEN);
step('shipped', dir, ['transition', '08b'], 0);
step('checkpoint', dir, ['checkpoint', '--quiet'], 0);
const resume = step('resume verifies', dir, ['resume'], 0);

const bad = steps.filter((s) => !s.ok);
const doc = [
  `# Scripted smoke v${VERSION} - pipeline walked with zero provider credentials`,
  '',
  `Date: ${new Date().toISOString()}. Repo: throwaway git under os.tmpdir(). Executor: deterministic Node script, not a model-driven feature delivery.`,
  'Environment: TYPESAFE_API_KEY, AEGIS_JUDGE_*, OPENROUTER_API_KEY, AI_GATEWAY_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY all deleted; JEV_BACKEND=mock. No step in this walk can reach a frontier model - judgments ran the deterministic mock, gates ran human-token approvals, verification ran local tools.',
  '',
  `**Result: ${steps.length - bad.length}/${steps.length} steps as expected${bad.length ? ' - PILOT FAILED, see below.' : ' - shipped 08b.'}**`,
  '',
  '| Result | Step | Command | Evidence |',
  '|---|---|---|---|',
  ...steps.map((s) => `| ${s.ok ? `✅ ${s.got}` : `❌ ${s.got} (wanted ${s.want})`} | ${s.note} | \`aegis ${s.cmd.replace(/^aegis /, '')}\` | ${s.out.replace(/\|/g, '\\|').slice(0, 120)} |`),
  '',
  '## What this proves (and does not)',
  '',
  '- Proves: the script observed expected exits for the 00a-08b state walk, synthetic gate approvals, contract/demo records, slice lane, clean oracle and checkpoint/resume. It does not prove gate-review quality or actual feature behavior.',
  '- Does NOT prove: executor-model variance. A small/free executor may fumble skill-following where a frontier model compensates. That trial needs a small model driving; it is explicitly unrun.',
].join('\n');
const out = writeReport(REPO_ROOT, 'scripted-smoke', VERSION, doc);
console.log(`scripted smoke: ${steps.length - bad.length}/${steps.length} as expected -> ${out}`);
for (const b of bad) console.log(`UNEXPECTED: ${b.cmd} -> ${b.got} (wanted ${b.want}): ${b.out.split('\n')[0]}`);
process.exit(bad.length ? 1 : 0);
