import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { AEGIS_DIR, die, git, ok, writeJ } from '../lib/util.js';
import { loadState, acquireState, commitState, stateP } from '../lib/state.js';
import { branchWorktree, localBranch, digest, proofPath, readProof, proofProblem, gitFile, TddProof, TestRun } from '../lib/tdd-proof.js';

/** Runs an owner-provided argv (not shell interpolation). RED must match
 * its declared failure exit; GREEN reuses that runner and identical tests.
 * These facts cannot establish whether an assertion tests the right thing.
 * Record only credential-free output; logs stay local under .aegis/tdd/. */
export function tdd(args: string[]): void {
  const [op, branch] = args;
  if (!['red', 'green', 'status'].includes(op) || !branch)
    die(2, 'usage: aegis tdd <red|green|status> <branch> [--test-file <path>] [--expect-exit <n>] [--timeout-ms <n>] -- <runner> <args>');
  loadState();
  const tip = localBranch(branch);
  if (!tip) die(2, `unknown local branch: ${branch}`);
  if (op === 'status') {
    const problem = proofProblem(branch, tip);
    console.log(problem ?? `TDD VERIFIED: ${branch} RED -> GREEN at ${tip}`);
    return;
  }
  const wt = branchWorktree(branch);
  if (!wt) die(4, 'branch must be checked out in a worktree to capture TDD evidence');
  if (git(['rev-parse', 'HEAD'], wt) !== tip || git(['status', '--porcelain'], wt)) die(4, 'commit the test/source snapshot before capturing TDD evidence');
  let old: TddProof | null;
  try { old = readProof(branch); }
  catch { die(9, 'TDD receipt unreadable - preserve it and investigate before recapturing'); }
  const sep = args.indexOf('--');
  const flags = args.slice(2, sep < 0 ? undefined : sep);
  const allowed = new Set(['--test-file', '--expect-exit', '--timeout-ms']);
  for (let i = 0; i < flags.length; i += 2) {
    if (!allowed.has(flags[i]) || !flags[i + 1] || flags[i + 1].startsWith('--'))
      die(2, `invalid TDD option: ${flags[i]}`);
  }
  const value = (name: string): string | undefined => {
    const i = flags.lastIndexOf(name);
    return i < 0 ? undefined : flags[i + 1];
  };
  const timeout = Number(value('--timeout-ms') ?? old?.timeout_ms ?? 60_000);
  if (!Number.isInteger(timeout) || timeout <= 0 || timeout > 120_000) die(2, 'TDD timeout must be 1..120000 milliseconds');
  const command = op === 'green' ? old?.command : sep < 0 ? [] : args.slice(sep + 1);
  if (!command?.length) die(2, op === 'green' ? 'record RED before GREEN' : 'RED needs an argv after --');
  if (op === 'green' && (old!.red.commit === tip || git(['merge-base', old!.red.commit, tip]) !== old!.red.commit))
    die(9, 'GREEN needs a new commit descending from RED; an unchanged retry is not a fix');
  if (op === 'green' && (sep >= 0 || flags.some((f) => f !== '--timeout-ms' && f.startsWith('--'))))
    die(2, 'GREEN reuses the RED command and test files; only --timeout-ms is allowed');
  const expected = op === 'green' ? 0 : Number(value('--expect-exit'));
  if (!Number.isInteger(expected) || expected < (op === 'red' ? 1 : 0) || expected > 125)
    die(2, 'RED requires --expect-exit 1..125 (timeouts/signals never qualify)');
  const files = op === 'green' ? old!.tests.map((t) => t.file)
    : flags.filter((_, i) => i > 0 && flags[i - 1] === '--test-file');
  if (!files.length) die(2, 'RED requires at least one --test-file');
  const tests = files.map((file) => {
    const normalized = file.replace(/\\/g, '/');
    if (path.isAbsolute(file) || normalized.split('/').includes('..') || normalized.startsWith('.git/'))
      die(2, 'test files must be repo-relative paths without ..');
    let content: Buffer;
    try { content = gitFile(tip, normalized); }
    catch { die(2, `test file is not committed at branch tip: ${file}`); }
    // The clean-tree check above applies Git's own filters (including CRLF
    // checkout normalization). The receipt pins canonical committed bytes.
    return { file: normalized, sha256: digest(content) };
  });
  if (op === 'green' && tests.some((t, i) => t.sha256 !== old!.tests[i].sha256))
    die(9, 'TDD test changed since RED - do not weaken the assertion to reach GREEN');
  const r = spawnSync(command[0], command.slice(1), {
    cwd: wt, encoding: 'utf8', shell: false, timeout, maxBuffer: 4 * 1024 * 1024,
  });
  if (r.error || r.signal || r.status !== expected)
    die(9, `TDD ${op.toUpperCase()} not recorded: expected exit ${expected}, observed ${r.error ? 'runner error/timeout' : r.signal ?? r.status}`);
  if (localBranch(branch) !== tip || git(['rev-parse', 'HEAD'], wt) !== tip || git(['status', '--porcelain'], wt))
    die(9, 'TDD snapshot changed during execution; no proof recorded');
  const out = JSON.stringify({ stdout: r.stdout, stderr: r.stderr });
  const record: TestRun = {
    commit: tip, exit: r.status!, at: new Date().toISOString(),
    output: `${crypto.randomUUID()}.log`, output_sha256: digest(out),
  };
  const s = acquireState(stateP);
  // No subprocess under the lock: verify receipt identity, not live state.
  let current: TddProof | null;
  try { current = readProof(branch); }
  catch { commitState(stateP, s); die(9, 'TDD receipt changed during capture'); }
  if ((current?.red.output_sha256 ?? null) !== (old?.red.output_sha256 ?? null)) {
    commitState(stateP, s);
    die(9, 'TDD RED evidence changed concurrently; no proof recorded');
  }
  fs.mkdirSync(path.join(AEGIS_DIR, 'tdd'), { recursive: true });
  fs.writeFileSync(path.join(AEGIS_DIR, 'tdd', record.output), out);
  const proof: TddProof = op === 'red'
    ? { version: 1, branch, command, timeout_ms: timeout, tests, red: record }
    : { ...old!, timeout_ms: timeout, green: record };
  writeJ(proofPath(branch), proof);
  s.history.push({ skill: s.current_skill, at: record.at, event: `tdd-${op}: ${branch} ${tip} exit=${record.exit} output-sha256=${record.output_sha256}` });
  commitState(stateP, s);
  ok(`TDD ${op.toUpperCase()} recorded: ${branch} ${tip} (exit ${record.exit}; semantic review still required)`);
}
