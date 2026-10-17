import { spawnSync } from 'node:child_process';
import { REPO, die, git, ok } from '../lib/util.js';
import { acquireState, commitState, loadState, stateP } from '../lib/state.js';
import { localBranch } from '../lib/tdd-proof.js';

/** Loop-until-clean review gate (SPEC §6) + lane quarantine (SPEC §8).
 *
 *  `aegis clean <branch>` - VERIFY (merge oracle, evidence-attached) ->
 *  CLASSIFY -> agent FIXes between runs -> RE-VERIFY -> PASS or cycle++.
 *  3 cycles -> escalate (exit 5). Re-verifying an unchanged SHA is doubt
 *  theater -> escalate immediately. No silent passes: PASS resets the
 *  counter, anything else is recorded in history.
 *
 *  `aegis quarantine freeze|clear|list` - park a failing lane: the merge
 *  oracle refuses quarantined paths until a human clears with --reason.
 *  Siblings continue on last-good. Clearing resumes clean cycles intact.
 *
 *  State lives on the ROOT state (branches and lanes are repo-global, never
 *  per-app). Lock is held only for the accounting write, never across the
 *  oracle run, so a slow typecheck cannot wedge concurrent executors. */

const MAX_CYCLES = 3;

function branchSha(branch: string): string {
  const sha = localBranch(branch);
  if (!sha) die(2, `unknown branch: ${branch}`);
  return sha;
}

/** Freeze target -> stored branch: explicit names win over guessed ones.
 *  Order: 'aegis/...' prefix as-is, then the bare ref as given, then the
 *  lane convention aegis/slice-<name> (verified, else guessed for lanes
 *  not yet registered). Never double-prefixes a name like 'slice-x'. */
function resolveFreezeBranch(target: string): string {
  const explicit = target.startsWith('refs/heads/');
  target = target.replace(/^refs\/heads\//, '');
  try { git(['check-ref-format', `refs/heads/${target}`]); }
  catch { die(2, `invalid quarantine branch or lane: ${target}`); }
  if (localBranch(target)) return target;
  if (explicit) die(2, 'explicit quarantine ref must name an existing exactly spelled local branch');
  if (target.startsWith('aegis/')) return target;
  return `aegis/slice-${target}`;
}

/** Quarantine record matcher: exact branch, the freeze target as given, or the
 *  slice-name <-> aegis/slice-<name> pair in either direction. Single source
 *  of truth for clean(), quarantine clear, and the merge-oracle refusal. */
export function quarantineMatch(r: { branch: string; target: string; canonical_ref?: string }, branch: string): boolean {
  if (!r || typeof r.branch !== 'string' || typeof r.target !== 'string') die(9, 'quarantine registry malformed - cannot verify branch safety');
  if (r.canonical_ref) return r.canonical_ref === `refs/heads/${branch}`;
  // Legacy full-ref records predate the explicit identity field. Ambiguous
  // nested spellings require review rather than skipping a possible freeze.
  if (r.branch === `refs/heads/${branch}`) {
    if (localBranch(r.branch)) die(9, 'legacy quarantine ref is ambiguous - review and clear its exact target');
    return true;
  }
  return r.branch === branch || r.target === branch ||
    branch === `aegis/slice-${r.target}` || r.branch === `aegis/slice-${branch}`;
}

export function quarantineHit(s: any, branch: string): any {
  const q: any[] = s.quarantine ?? [];
  return q.find((r) => quarantineMatch(r, branch));
}

function runOracle(branch: string, flags: string[]): { code: number; out: string } {
  const r = spawnSync(process.execPath, [process.argv[1], 'merge', 'check', `refs/heads/${branch}`, ...flags],
    { cwd: REPO, encoding: 'utf8', timeout: 900_000 });
  const out = `${r.stdout ?? ''}\n${r.stderr ?? ''}`.trim();
  if (r.error) return { code: 9, out: `${out}\noracle harness error: ${String(r.error).split('\n')[0]}` };
  return { code: r.status ?? 9, out };
}

function classify(code: number, out: string): string[] {
  if (code === 0) return ['PASS'];
  if (code === 13) return ['NOTHING-TO-MERGE'];
  const c: string[] = [];
  if (out.includes('MERGE CONFLICT')) c.push('TEXT-CONFLICT');
  if (out.includes('CONTRACT DRIFT')) c.push('CONTRACT-DRIFT');
  if (out.includes('QUARANTINED')) c.push('QUARANTINED');
  if (/TDD (?:proof|GREEN|RED|test|outcomes|output|integrated)/.test(out)) c.push('TDD-PROOF');
  // Precise QUALITY refusal classes (v0.11 R1): the oracle also prints
  // QUALITY UNMEASURED/VERIFIED accounting lines on legacy or successful
  // runs - those are not failure classes.
  if (/QUALITY (?:acceptance|review|evidence)|QUALITY\/TDD evidence/.test(out)) c.push('QUALITY');
  if (/FAILED:/.test(out)) c.push('TYPECHECK');
  if (!c.length) c.push(code === 9 ? 'ORACLE-REFUSED' : `EXIT-${code}`);
  return c;
}

const evidence = (out: string, n = 12): string =>
  out.split('\n').filter((l) => l.trim()).slice(-n).join('\n');

export function clean(args: string[]): void {
  const branch = args[0]?.replace(/^refs\/heads\//, '');
  if (!branch) die(2, 'usage: aegis clean <branch>');
  if (args.slice(1).some((a) => !['--require-proof', '--require-quality'].includes(a))) die(2, 'unknown clean option');
  const pre = loadState() as any;
  const frozen = quarantineHit(pre, branch);
  if (frozen)
    die(9, `clean REFUSED ${branch}: QUARANTINED (${frozen.reason}) - clear first: aegis quarantine clear ${frozen.target} --reason "<why>"`);
  const sha = branchSha(branch);
  const short = sha.slice(0, 8);
  const flags = args.filter((a) => ['--require-proof', '--require-quality'].includes(a));
  const ref = `refs/heads/${branch}`;
  const safeHint = /^[A-Za-z0-9_./-]+$/.test(ref);
  const rerun = safeHint ? `aegis clean ${ref}${flags.length ? ` ${flags.join(' ')}` : ''}`
    : 'invoke clean with the exact ref as one literal argument; no shell command is emitted for this name';
  const park = safeHint ? `aegis quarantine freeze ${ref}`
    : 'invoke quarantine freeze with the exact ref as one literal argument';
  if (!safeHint) console.log(`exact ref (data, not shell syntax): ${JSON.stringify(ref)}`);

  const { code, out } = runOracle(branch, flags);
  const classes = classify(code, out);
  const at = new Date().toISOString();

  // Accounting under lock (fast: no subprocess inside).
  const s = acquireState(stateP) as any;
  s.clean ??= {};
  const rec = s.clean[branch] ?? { cycles: 0, last_sha: '', last_class: '' };

  if (classes[0] === 'PASS') {
    delete s.clean[branch];
    s.history.push({ skill: s.current_skill, at, event: `clean-pass ${branch} (${short}; ${flags.join(' ') || 'legacy absent-receipts allowed'})` });
    commitState(stateP, s);
    for (const line of out.split('\n').filter((line) => /UNMEASURED|UNVERIFIED/.test(line))) console.log(line);
    ok(`clean PASSED ${branch} (${short}, oracle exit 0, cycles reset)`);
    return;
  }

  const label = classes.join('+');
  // Doubt theater: same SHA, same failure, no fix between runs.
  if (sha === rec.last_sha) {
    s.history.push({ skill: s.current_skill, at, event: `clean-escalation ${branch} (theater: ${label} @ ${short})` });
    commitState(stateP, s);
    die(5, `clean ESCALATION ${branch}: doubt theater - re-verified ${short} with no new changes (same failure: ${label})\n` +
      `evidence:\n${evidence(out)}\n` +
      `recovery: fix the cause (a new SHA re-arms the gate), or park the lane: ${park} --reason "<why>"`);
  }

  rec.cycles += 1;
  rec.last_sha = sha;
  rec.last_class = label;
  s.clean[branch] = rec;
  if (rec.cycles >= MAX_CYCLES) {
    s.history.push({ skill: s.current_skill, at, event: `clean-escalation ${branch} (${label}, ${rec.cycles}/${MAX_CYCLES} cycles)` });
    commitState(stateP, s);
    die(5, `clean ESCALATION ${branch}: ${rec.cycles}/${MAX_CYCLES} cycles exhausted (${label} @ ${short})\n` +
      `evidence:\n${evidence(out)}\n` +
      `recovery: a human reviews, then one of: fix + ${rerun} | ${park} --reason "<why>" | aegis loops reset --reason "<why>"`);
  }
  s.history.push({ skill: s.current_skill, at, event: `clean-fail ${branch} (${label}, cycle ${rec.cycles}/${MAX_CYCLES})` });
  commitState(stateP, s);
  die(9, `clean FAIL ${branch}: ${label} @ ${short} (cycle ${rec.cycles}/${MAX_CYCLES})\n` +
    `${evidence(out)}\n` +
    `fix, then: ${rerun} (${MAX_CYCLES - rec.cycles} cycle(s) left; re-running this SHA unchanged escalates as doubt theater)`);
}

export function quarantine(args: string[]): void {
  const [op, target] = args;
  if (op === 'list') {
    const s = loadState() as any;
    const q: any[] = s.quarantine ?? [];
    if (!q.length) { console.log('no quarantined lanes'); return; }
    for (const r of q) console.log(`FROZEN ${r.target} (-> ${r.branch}): ${r.reason} (since ${r.at})`);
    return;
  }
  if ((op !== 'freeze' && op !== 'clear') || !target)
    die(2, 'usage: aegis quarantine <freeze|clear|list> <target> --reason "<why>" (freeze/clear require --reason)');
  const ri = args.indexOf('--reason');
  const reason = ri >= 0 ? args[ri + 1] : undefined;
  if (!reason) die(4, `quarantine ${op} requires --reason <text> (audited, human-reviewed)`);
  const branch = resolveFreezeBranch(target);
  const s = acquireState(stateP) as any;
  s.quarantine ??= [];
  const at = new Date().toISOString();
  if (op === 'freeze') {
    if (quarantineHit(s, branch))
      die(4, `already quarantined: ${target} (clear first: aegis quarantine clear ${target} --reason "<why>")`);
    s.quarantine.push({ target, branch, canonical_ref: `refs/heads/${branch}`, reason, at });
    s.history.push({ skill: s.current_skill, at, event: `quarantine-freeze ${target}`, reason });
    commitState(stateP, s);
    ok(`quarantine frozen: ${target} (-> ${branch}) - oracle refuses until: aegis quarantine clear ${target} --reason "<why>"`);
    return;
  }
  const i = s.quarantine.findIndex((r: any) => r.target === target || quarantineMatch(r, branch));
  if (i === -1) die(2, `not quarantined: ${target} (see: aegis quarantine list)`);
  const [cleared] = s.quarantine.splice(i, 1);
  const retained = (s.clean ?? {})[cleared.branch]?.cycles ?? (s.clean ?? {})[cleared.target]?.cycles ?? 0;
  s.history.push({ skill: s.current_skill, at, event: `quarantine-clear ${cleared.target}`, reason });
  commitState(stateP, s);
  ok(`quarantine cleared: ${cleared.target} (${retained} clean cycle(s) retained) - oracle re-armed`);
}
