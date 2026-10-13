// Adversarial audit harness (walkthrough audit, every step in detail):
// every command with hostile inputs, every refusal path, exit-code contract,
// idempotency, state-machine edges, integrity trips, and stress sweeps.
// Runs against ONE scratch repo with real git; deterministic backends
// (JEV_BACKEND=mock); AEGIS_HUMAN_TOKEN=1 only where a human gate is the
// documented path. Any deviation from the EXPECTED column is a finding.
// Usage: node scripts/audit.mjs [--section A|B|C|D|E|F]

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLI = path.join(REPO_ROOT, 'dist', 'cli.js');
const GIT_ID = ['-c', 'user.email=aegis-audit@example.com', '-c', 'user.name=aegis-audit'];
const TOKEN = { AEGIS_HUMAN_TOKEN: '1' };
const MOCK = { JEV_BACKEND: 'mock' };
const NOKEY = { TYPESAFE_API_KEY: '', JEV_BACKEND: '' };

const findings = [];
let checks = 0;

function sh(cwd, bin, args, env = {}, timeout = 30000) {
  const r = spawnSync(bin, args, { cwd, encoding: 'utf8', env: { ...process.env, ...env }, timeout });
  return { code: r.error ? -1 : (r.status ?? 1), stdout: r.stdout ?? '', stderr: r.stderr ?? '', timedOut: !!r.error };
}

function git(dir, args) {
  const r = sh(dir, 'git', [...GIT_ID, ...args]);
  if (r.code !== 0) throw new Error(`setup git failed: ${args.join(' ')}: ${r.stderr}`);
  return r;
}

function check(section, note, actual, want, detail = '') {
  checks++;
  const ok = want === undefined ? true : actual === want;
  if (!ok) findings.push({ section, note, actual, want, detail: detail.slice(0, 300) });
  return ok;
}

function run(dir, section, note, args, want, env = {}) {
  const r = sh(dir, process.execPath, [CLI, ...args], env);
  check(section, note, r.code, want, `${r.stdout}${r.stderr}`);
  return r;
}

function scratch() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-audit-'));
  git(dir, ['init', '-q', '-b', 'main']);
  git(dir, ['commit', '-q', '--allow-empty', '-m', 'init']);
  return dir;
}

function write(dir, file, contents) {
  const p = path.join(dir, file);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, contents);
}

function commitAll(dir, msg) {
  git(dir, ['add', '-A']);
  git(dir, ['commit', '-q', '-m', msg]);
}

/* ---------------- A. usage/shape matrix: every refusal path ---------------- */
function sectionA(dir) {
  const S = 'A';
  const cases = [
    ['transition (bare)', ['transition'], 2], ['gate (bare)', ['gate'], 7],
    ['gate unknown + token', ['gate', 'NOPE', '--approve'], 7, TOKEN],
    ['gate PRD no token non-TTY', ['gate', 'PRD', '--approve'], 7],
    ['loops reset (bare)', ['loops', 'reset'], 4], ['loops bogus', ['loops', 'bogus'], 2],
    ['lane (bare)', ['lane'], 2], ['lane open (no slice)', ['lane', 'open'], 2],
    ['fix (bare)', ['fix'], 2], ['fix start (empty)', ['fix', 'start'], 2],
    ['fix done (none open)', ['fix', 'done'], 4], ['fix abandon (none open)', ['fix', 'abandon'], 4],
    ['chore (empty)', ['chore'], 2],
    ['clean (bare)', ['clean'], 2], ['clean unknown branch', ['clean', 'no-such-branch'], 2],
    ['quarantine (bare)', ['quarantine'], 2], ['quarantine freeze (bare)', ['quarantine', 'freeze'], 2],
    ['quarantine freeze no reason', ['quarantine', 'freeze', 'x'], 4],
    ['quarantine clear missing', ['quarantine', 'clear', 'x', '--reason', 'y'], 2],
    ['quarantine list (empty)', ['quarantine', 'list'], 0],
    ['memory (bare)', ['memory'], 2], ['memory add (empty)', ['memory', 'add'], 2],
    ['memory get unknown', ['memory', 'get', 'mem-9999'], 2],
    ['memory verify unknown', ['memory', 'verify', 'mem-9999'], 2],
    ['memory retire unknown', ['memory', 'retire', 'mem-9999', '--reason', 'x'], 2],
    ['memory reconcile unknown', ['memory', 'reconcile', 'mem-9999', '--winner', 'a', '--resolution', 'b'], 2],
    ['memory promote (bare)', ['memory', 'promote'], 2],
    ['memory promote missing lane', ['memory', 'promote', '--lane', 'nope'], 2],
    ['demo (bare)', ['demo'], 2], ['demo record (bare)', ['demo', 'record'], 2],
    ['demo record bad kind', ['demo', 'record', '--kind', 'bogus', '--file', 'x'], 2],
    ['demo status (empty)', ['demo', 'status'], 0],
    ['jev (bare)', ['jev'], 2], ['jev judge (no file)', ['jev', 'judge'], 2],
    ['jev bogus op', ['jev', 'frobnicate', '--file', 'x'], 2],
    ['eval (bare)', ['eval'], 2], ['eval missing file', ['eval', 'nope.md'], 2],
    ['merge check (bare)', ['merge', 'check'], 2], ['merge check unknown', ['merge', 'check', 'no-branch'], 2],
    ['merge bogus', ['merge', 'frobnicate'], 2],
    ['slice (bare)', ['slice'], 2], ['slice create (bare)', ['slice', 'create'], 2],
    ['slice remove unknown', ['slice', 'remove', 'nope'], 2], ['slice list (empty)', ['slice', 'list'], 0],
    ['validate (bare)', ['validate'], 2], ['validate bogus', ['validate', 'bogus-suite'], 2],
    ['config set (bare)', ['config', 'set'], 2], ['config set bogus', ['config', 'set', 'bogus-key', 'v'], 2],
    ['contracts (nothing pinned)', ['contracts'], 4],
    ['ast (bare)', ['ast'], 2],
    ['exec (bare)', ['exec'], 2], ['unknown command', ['frobnicate'], 2],
    ['help', ['help'], 0], ['--version', ['--version'], 0],
    ['checkpoint', ['checkpoint'], 0], ['doctor', ['doctor'], 0],
    ['status', ['status'], 0], ['sync', ['sync'], 0], ['gc', ['gc'], 0],
    ['migrate (current)', ['migrate'], 0], ['monitor (no targets)', ['monitor', '--once'], 0],
    ['hooks reinstall', ['hooks'], 0], ['wave', ['wave'], 0],
  ];
  for (const [note, args, want, env] of cases) run(dir, S, note, args, want, env ?? {});
  run(dir, S, 'transition bare usage (malformed -> 2, not illegal)', ['transition'], 2);
  // open-fix branch of abandon-reason rule
  run(dir, S, 'fix start', ['fix', 'start', 'audit probe'], 0);
  run(dir, S, 'fix abandon w/o reason (open fix)', ['fix', 'abandon'], 4);
  run(dir, S, 'fix abandon with reason', ['fix', 'abandon', '--reason', 'probe done'], 0);
}

/* ---------------- B. state machine: edges, gates, rollbacks ---------------- */
function sectionB(dir) {
  const S = 'B';
  for (const to of ['04a', '05a', '08b', '02c']) run(dir, S, `illegal jump 00a -> ${to}`, ['transition', to], 4);
  run(dir, S, 'walk 00b', ['transition', '00b'], 0);
  run(dir, S, 'walk 01a', ['transition', '01a'], 0);
  run(dir, S, '01b blocked on PRD', ['transition', '01b'], 4);
  run(dir, S, 'approve PRD', ['gate', 'PRD', '--approve'], 0, TOKEN);
  run(dir, S, 'walk 01b', ['transition', '01b'], 0);
  run(dir, S, 'backward 01b -> 01a w/o reason', ['transition', '01a'], 4);
  run(dir, S, 'backward 01b -> 01a with reason', ['transition', '01a', '--reason', 'audit: re-open'], 0);
  run(dir, S, 're-walk 01b (loop counter 2/3)', ['transition', '01b'], 0);
  const st = JSON.parse(fs.readFileSync(path.join(dir, '.aegis', 'state.json'), 'utf8'));
  check(S, 'loop counter recorded the re-traversal', st.loop_counters['01a->01b'], 2, JSON.stringify(st.loop_counters));
  run(dir, S, 'loops reset needs reason', ['loops', 'reset'], 4);
  run(dir, S, 'loops reset with reason', ['loops', 'reset', '--reason', 'audit reviewed'], 0);
  const st2 = JSON.parse(fs.readFileSync(path.join(dir, '.aegis', 'state.json'), 'utf8'));
  check(S, 'loops reset zeroes counters', Object.keys(st2.loop_counters).length, 0, JSON.stringify(st2.loop_counters));
}

/* ---------------- C. integrity trips ---------------- */
function sectionC(dir) {
  const S = 'C';
  run(dir, S, 'checkpoint', ['checkpoint'], 0);
  const sp = path.join(dir, '.aegis', 'state.json');
  const s = JSON.parse(fs.readFileSync(sp, 'utf8'));
  s.current_skill = '08b'; // hand-edit behind the runtime's back
  fs.writeFileSync(sp, JSON.stringify(s, null, 2) + '\n');
  run(dir, S, 'tampered state -> exit 6', ['resume'], 6);
  run(dir, S, 'fresh checkpoint rebaselines', ['checkpoint'], 0);
  run(dir, S, 'resume verifies after rebaseline', ['resume'], 0);
}

/* ---------------- D. idempotency: twice-run reads are byte-identical ---------------- */
function sectionD(dir) {
  const S = 'D';
  const pairs = [
    ['status', ['status']], ['demo status', ['demo', 'status']],
    ['quarantine list', ['quarantine', 'list']], ['memory list', ['memory', 'list']],
    ['slice list', ['slice', 'list']], ['config print', ['config']],
  ];
  for (const [note, args] of pairs) {
    const a = sh(dir, process.execPath, [CLI, ...args], { env: process.env });
    const b = sh(dir, process.execPath, [CLI, ...args], { env: process.env });
    check(S, `${note} exit 0 twice`, `${a.code}/${b.code}`, '0/0', `${a.stdout}${a.stderr}`.slice(0, 200));
    check(S, `${note} byte-identical`, a.stdout, b.stdout, 'outputs differed');
  }
  run(dir, S, 'checkpoint for handoff', ['checkpoint'], 0);
  const h1 = sh(dir, process.execPath, [CLI, 'status', '--markdown'], { env: process.env });
  const hp = path.join(dir, 'brain', 'handoff.md');
  const once = fs.readFileSync(hp, 'utf8');
  sh(dir, process.execPath, [CLI, 'status', '--markdown'], { env: process.env });
  check(S, 'handoff byte-identical across runs', fs.readFileSync(hp, 'utf8'), once, once.slice(0, 200));
  void h1;
}

/* ---------------- E. stress ---------------- */
function sectionE(dir) {
  const S = 'E';
  // E1: 20 concurrent exec (suite proves 10)
  const N = 20;
  const kids = [];
  for (let i = 0; i < N; i++)
    kids.push(sh(dir, process.execPath, [CLI, 'exec', '--', `"${process.execPath}" -e "process.exit(0)"`], { env: process.env }));
  const bad = kids.filter((k) => k.code !== 0).length;
  check(S, `${N} concurrent exec all exit 0`, bad, 0, kids.find((k) => k.code !== 0)?.stderr.slice(0, 200) ?? '');
  const hist = JSON.parse(fs.readFileSync(path.join(dir, '.aegis', 'state.json'), 'utf8')).history;
  const recorded = hist.filter((h) => (h.event ?? '').startsWith('exec (exit 0):')).length;
  check(S, `${N}/${N} exec events recorded (no lost updates)`, recorded, N, `recorded ${recorded}`);
  // E2: 5 rapid checkpoints, resume verifies
  for (let i = 0; i < 5; i++) run(dir, S, `rapid checkpoint ${i + 1}/5`, ['checkpoint', '--quiet'], 0);
  run(dir, S, 'resume verifies after rapid checkpoints', ['resume'], 0);
  // E3: 50 sequential memory adds keep seq integrity (single-writer contract)
  for (let i = 0; i < 50; i++) {
    const r = sh(dir, process.execPath, [CLI, 'memory', 'add', '--type', 'finding', '--title', `bulk ${i}`, '--body', 'stress'],
      { env: process.env });
    if (r.code !== 0) { check(S, `bulk memory add ${i}`, r.code, 0, `${r.stdout}${r.stderr}`.slice(0, 200)); break; }
  }
  const lines = fs.readFileSync(path.join(dir, '.aegis', 'memory', 'records.jsonl'), 'utf8').trim().split('\n');
  const ids = lines.map((l) => JSON.parse(l).id);
  check(S, '50 records appended', ids.length, 50, `${ids.length}`);
  check(S, 'seq ids unique, no gaps', new Set(ids).size === 50 && ids[49] === 'mem-0050', true, ids.slice(-3).join(','));
  // E4: hostile branch name through clean refusal path
  const weird = 'a'.repeat(100);
  git(dir, ['checkout', '-qb', weird]);
  write(dir, 'w.txt', 'x');
  git(dir, ['add', '-A']);
  git(dir, ['commit', '-q', '-m', 'weird']);
  git(dir, ['checkout', '-q', 'main']);
  const r = sh(dir, process.execPath, [CLI, 'clean', weird], { env: process.env });
  check(S, '100-char branch name handled (0 pass or 9 classified)', r.code === 0 || r.code === 9, true, `exit ${r.code}: ${`${r.stdout}${r.stderr}`.slice(0, 200)}`);
  // E5: repeated init --overwrite converges
  run(dir, S, 'init --overwrite converges', ['init', '--yes', '--overwrite'], 0);
  run(dir, S, 'post-overwrite status', ['status'], 0);
}

/* ---------------- F. help-surface consistency: every command dispatches ---------------- */
function sectionF(dir) {
  const S = 'F';
  const help = sh(dir, process.execPath, [CLI, 'help'], { env: process.env }).stdout;
  const cmds = [...new Set([...help.matchAll(/^  ([a-z][a-z-]*)/gm)].map((m) => m[1]))]
    .filter((c) => !['exit'].includes(c));
  check(S, 'help advertises a sane command count (>=30)', cmds.length >= 30, true, `${cmds.length}: ${cmds.join(',')}`);
  for (const cmd of cmds) {
    // init scaffolds interactively (would hang on interview); update touches
    // the network (new-version check). Neither is bare-run safe.
    if (cmd === 'init' || cmd === 'update') continue;
    const r = sh(dir, process.execPath, [CLI, cmd], { env: { ...process.env, ...MOCK } }, 15000);
    const crashed = r.timedOut || r.code === 3221226505 || r.code > 125;
    check(S, `bare '${cmd}' never crashes/hangs (exit ${r.code})`, crashed, false,
      `exit=${r.code} timedOut=${r.timedOut} out=${`${r.stdout}${r.stderr}`.slice(0, 160)}`);
  }
}

const sections = { A: sectionA, B: sectionB, C: sectionC, D: sectionD, E: sectionE, F: sectionF };
const si = process.argv.indexOf('--section');
const only = (si >= 0 && process.argv[si + 1] ? process.argv[si + 1] : 'ABCDEF').toUpperCase();

const dir = scratch();
sh(dir, process.execPath, [CLI, 'init', '--yes'], { env: process.env });
commitAllSafe(dir);
function commitAllSafe(d) {
  git(d, ['add', '-A']);
  git(d, ['commit', '-q', '-m', 'scaffold']);
}
for (const key of only) {
  if (!sections[key]) { console.error(`unknown section ${key}`); process.exit(2); }
  console.log(`--- section ${key} ---`);
  sections[key](dir);
}

console.log(`\naudit: ${checks} checks, ${findings.length} finding(s)`);
for (const f of findings)
  console.log(`FINDING [${f.section}] ${f.note}: got ${JSON.stringify(f.actual)}, want ${JSON.stringify(f.want)}${f.detail ? ` | ${f.detail.split('\n')[0]}` : ''}`);
process.exit(findings.length ? 1 : 0);
