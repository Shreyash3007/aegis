import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync, spawnSync } from 'node:child_process';
import { REPO, die, git, gitTry, gitRaw, ok } from '../lib/util.js';
import { contractsPath, stateP, loadState } from '../lib/state.js';
import { quarantineMatch } from './clean.js';
import { detectStack, typecheckCommand } from '../lib/oracles.js';
import { branchWorktree, localBranch, proofPath, proofProblem, readProof, TddProof } from '../lib/tdd-proof.js';
import { qualityProblem, readQuality, runCriteria, QualitySnapshot } from '../lib/quality-evidence.js';

/** aegis merge check <branch> - the merge oracle (N3, simulation-proven).
 *  Real git merge in an OS-temp worktree (A1.5), tsc, contract immutability
 *  via git-native diff (A1.1). Exit 9 = refused. Exit 13 = nothing to merge
 *  (never reported as PASS, A1.6). */
/** Some git versions demand a committer identity even for --no-commit
 *  merges, and clean CI runners ship no global identity (GitHub runners) -
 *  the v0.6-0.8 releases shipped with this broken unnoticed. Synthetic
 *  per-invocation identity: --no-commit creates nothing, repo config is
 *  never touched, and real conflicts behave identically. */
const ORACLE_ID = ['-c', 'user.email=aegis-oracle@invalid', '-c', 'user.name=aegis-merge-oracle'];

function dependencySnapshot(root: string): string {
  const files = ['package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock', 'pnpm-lock.yaml'];
  const locks = files.map((f) => fs.existsSync(path.join(root, f))
    ? fs.readFileSync(path.join(root, f), 'utf8').replace(/\r\n/g, '\n') : null);
  const manifest = path.join(root, 'package.json');
  const pkg = fs.existsSync(manifest) ? JSON.parse(fs.readFileSync(manifest, 'utf8')) : {};
  const deps = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']
    .map((key) => Object.entries(pkg[key] ?? {}).sort(([a], [b]) => a.localeCompare(b)));
  return JSON.stringify([locks, deps]);
}
export function merge(args: string[]): void {
  if (args[0] !== 'check' || !args[1]) die(2, 'usage: aegis merge check <branch>');
  if (args.slice(2).some((a) => !['--require-proof', '--require-quality'].includes(a))) die(2, 'unknown merge option');
  const branch = args[1].replace(/^refs\/heads\//, '');
  const branchSha = localBranch(branch);
  if (!branchSha) die(2, `unknown local branch (revision expressions are not supported): ${args[1]}`);
  const baseSha = git(['rev-parse', 'HEAD']);
  // Quarantined lanes (SPEC §8): the oracle refuses quarantined paths until
  // a human clears them. Manual JSON read (not loadState): a corrupt or
  // missing state must not change merge behavior - no quarantine, no refusal.
  if (fs.existsSync(stateP)) {
    const st = loadState();
    if (st.quarantine !== undefined && !Array.isArray(st.quarantine)) die(9, 'quarantine registry malformed - cannot verify merge');
    const hit = (st.quarantine ?? []).find((r) => quarantineMatch(r, branch));
    if (hit) die(9, `QUARANTINED ${branch} (frozen: ${hit.reason}) - oracle refuses until a human clears: aegis quarantine clear ${hit.target} --reason "<why>"`);
  }
  if (gitTry(['merge-base', branchSha, baseSha]) === branchSha) {
    console.log('NOTHING TO MERGE: branch is already contained in base. This is NOT a pass (A1.6).');
    process.exit(13);
  }

  let qualitySnapshot: QualitySnapshot;
  let proofSnapshot: TddProof | null;
  try {
    qualitySnapshot = { acceptance: readQuality(branch, 'acceptance'), review: readQuality(branch, 'review') };
    proofSnapshot = readProof(branch);
  } catch { die(9, 'QUALITY/TDD evidence unreadable or malformed - cannot verify merge'); }
  const qualityIssue = qualityProblem(branch, branchSha, args.includes('--require-quality'), qualitySnapshot);
  if (qualityIssue) die(9, qualityIssue);

  const proofRequired = args.includes('--require-proof') || fs.existsSync(proofPath(branch));
  if (proofRequired) {
    const problem = proofProblem(branch, branchSha, proofSnapshot);
    if (problem) die(9, problem);
    console.log(`TDD RED -> GREEN verified at ${branchSha}`);
  } else console.log('TDD UNMEASURED - no receipt; --require-proof makes evidence mandatory');

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-merge-'));
  const cleanup = (): void => {
    try {
      // worktrees keep git metadata in the real gitdir (the .git FILE at the
      // worktree root points there) - resolve it before probing for MERGE_HEAD
      const gitDir = git(['rev-parse', '--git-dir'], tmp);
      if (fs.existsSync(path.resolve(tmp, gitDir, 'MERGE_HEAD'))) git(['merge', '--abort'], tmp);
      git(['worktree', 'remove', tmp, '--force']);
    } catch { /* best effort */ }
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* best effort */ }
    try { git(['worktree', 'prune']); } catch { /* best effort */ }
  };

  process.once('exit', cleanup);
  try { git(['worktree', 'prune']); git(['worktree', 'add', '--detach', tmp, baseSha]); }
  catch { cleanup(); die(9, `failed to create merge-test worktree`); }

  try { git([...ORACLE_ID, 'merge', '--no-commit', '--no-ff', branchSha], tmp); }
  catch { cleanup(); die(9, `MERGE CONFLICT in ${branch} - text conflicts need LLM resolution with compiler context`); }

  const failed: string[] = [];

  // Reuse installed modules only from a checkout matching the merged dependency
  // snapshot. Linking base modules for a changed lock tests the wrong code.
  let dependencyRoot = REPO;
  try {
    const snapshot = dependencySnapshot(tmp);
    if (dependencySnapshot(REPO) !== snapshot) {
      const slice = branchWorktree(branch);
      if (!slice || dependencySnapshot(slice) !== snapshot || !fs.existsSync(path.join(slice, 'node_modules'))) {
        cleanup();
        die(9, 'DEPENDENCIES changed: prepare a matching slice installation before running the merge oracle');
      }
      dependencyRoot = slice;
      console.log('dependencies: slice installation (matching dependency snapshot; installation provenance is caller-managed)');
    }
  } catch {
    cleanup();
    die(9, 'DEPENDENCIES snapshot unreadable - fix the manifest before verification');
  }
  const nm = path.join(dependencyRoot, 'node_modules');
  if (fs.existsSync(nm) && !fs.existsSync(path.join(tmp, 'node_modules'))) {
    try { fs.symlinkSync(nm, path.join(tmp, 'node_modules'), 'junction'); }
    catch { /* different layout or fs restriction - oracle degrades honestly below */ }
  }

  // oracle 1: typecheck the MERGED worktree with the repo's real checker
  // (typecheckCommand), degrading honestly to an advisory UNVERIFIED when the
  // toolchain is missing - never hard-fail a foreign-toolchain merge.
  const stack = detectStack(tmp);
  const tcCommand = typecheckCommand(tmp);
  const tcLabel = stack === 'typescript' ? 'tsc --noEmit'
    : stack === 'go' ? 'go vet' : stack === 'rust' ? 'cargo check'
    : stack === 'python' ? 'compileall' : 'typecheck';
  if (tcCommand) {
    try { execSync(tcCommand, { cwd: tmp, encoding: 'utf8', stdio: 'pipe', timeout: 120_000 }); }
    catch (e: any) {
      const out = [e.stdout, e.stderr].filter(Boolean).join('\n') || e.message;
      failed.push(`${tcLabel} FAILED:\n${String(out).split('\n').slice(0, 12).join('\n')}`);
    }
  } else {
    console.log(`warn: ${stack === 'unknown' ? 'no recognized stack' : `${stack} toolchain unavailable`} in target repo - typecheck oracle UNVERIFIED (advisory)`);
  }

  // oracle 2: contract immutability (git-native diff, A1.1)
  const drift = gitRaw(['diff', '--name-only', 'HEAD', '--', contractsPath()], tmp).trim();
  if (drift) failed.push(`CONTRACT DRIFT: slice modified immutable contracts (N1):\n  ${drift.split('\n').join('\n  ')}`);

  if (proofRequired) {
    const proof = proofSnapshot!;
    const checked = spawnSync(proof.command[0], proof.command.slice(1), {
      cwd: tmp, encoding: 'utf8', timeout: proof.timeout_ms ?? 60_000, maxBuffer: 4 * 1024 * 1024,
    });
    if (checked.error || checked.signal || checked.status !== 0)
      failed.push('TDD integrated test FAILED: recorded runner did not pass against the merged tree');
  }

  const accepted = qualitySnapshot.acceptance;
  if (accepted?.criteria && runCriteria(accepted.criteria, tmp).some((r) => r.status !== 'PASS'))
    failed.push('QUALITY acceptance FAILED against merged tree');

  if (localBranch(branch) !== branchSha || git(['rev-parse', 'HEAD']) !== baseSha)
    failed.push('snapshot changed during verification: feature or base moved - rerun against the current commits');
  cleanup();
  process.off('exit', cleanup);
  if (failed.length) die(9, `MERGE ORACLE REFUSED ${branch}:\n${failed.join('\n')}`);
  ok(`merge oracle PASSED ${branch} (base ${baseSha}, feature ${branchSha}; ${tcCommand ? `${tcLabel} clean` : 'typecheck UNVERIFIED'}, contracts intact)`);
}
