import { spawnSync } from 'node:child_process';
import { REPO, die, gitTry, ok } from '../lib/util.js';
import { acquireState, commitState, loadState, stateP } from '../lib/state.js';

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
  const sha = gitTry(['rev-parse', branch]);
  if (!sha) die(2, `unknown branch: ${branch}`);
  return sha;
}

/** Quarantine match: exact branch, the freeze target as given, or the
 *  slice-name <-> aegis/slice-<name> pair in either direction. */
export function quarantineHit(s: any, branch: string): any {
  const q: any[] = s.quarantine ?? [];
  return q.find((r) => r.branch === branch || r.target === branch ||
    branch === `aegis/slice-${r.target}` || r.branch === `aegis/slice-${branch}`);
}

function runOracle(branch: string): { code: number; out: string } {
  const r = spawnSync(process.execPath, [process.argv[1], 'merge', 'check', branch],
    { cwd: REPO, encoding: 'utf8', timeout: 120_000 });
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
  if (/FAILED:/.test(out)) c.push('TYPECHECK');
  if (!c.length) c.push(code === 9 ? 'ORACLE-REFUSED' : `EXIT-${code}`);
  return c;
}

const evidence = (out: string, n = 12): string =>
  out.split('\n').filter((l) => l.trim()).slice(-n).join('\n');

export function clean(args: string[]): void {
  const branch = args[0];
  if (!branch) die(2, 'usage: aegis clean <branch>');
  const pre = loadState() as any;
  const frozen = quarantineHit(pre, branch);
  if (frozen)
    die(9, `clean REFUSED ${branch}: QUARANTINED (${frozen.reason}) - clear first: aegis quarantine clear ${frozen.target} --reason "<why>"`);
  const sha = branchSha(branch);
  const short = sha.slice(0, 8);

  const { code, out } = runOracle(branch);
  const classes = classify(code, out);
  const at = new Date().toISOString();

  // Accounting under lock (fast: no subprocess inside).
  const s = acquireState(stateP) as any;
  s.clean ??= {};
  const rec = s.clean[branch] ?? { cycles: 0, last_sha: '', last_class: '' };

  if (classes[0] === 'PASS') {
    delete s.clean[branch];
    s.history.push({ skill: s.current_skill, at, event: `clean-pass ${branch} (${short})` });
    commitState(stateP, s);
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
      `recovery: fix the cause (a new SHA re-arms the gate), or park the lane: aegis quarantine freeze ${branch} --reason "<why>"`);
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
      `recovery: a human reviews, then one of: fix + aegis clean ${branch} | aegis quarantine freeze ${branch} --reason "<why>" | aegis loops reset --reason "<why>"`);
  }
  s.history.push({ skill: s.current_skill, at, event: `clean-fail ${branch} (${label}, cycle ${rec.cycles}/${MAX_CYCLES})` });
  commitState(stateP, s);
  die(9, `clean FAIL ${branch}: ${label} @ ${short} (cycle ${rec.cycles}/${MAX_CYCLES})\n` +
    `${evidence(out)}\n` +
    `fix, then: aegis clean ${branch} (${MAX_CYCLES - rec.cycles} cycle(s) left; re-running this SHA unchanged escalates as doubt theater)`);
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
  const branch = target.startsWith('aegis/') ? target : `aegis/slice-${target}`;
  const s = acquireState(stateP) as any;
  s.quarantine ??= [];
  const at = new Date().toISOString();
  if (op === 'freeze') {
    if (quarantineHit(s, branch) || quarantineHit(s, target))
      die(4, `already quarantined: ${target} (clear first: aegis quarantine clear ${target} --reason "<why>")`);
    s.quarantine.push({ target, branch, reason, at });
    s.history.push({ skill: s.current_skill, at, event: `quarantine-freeze ${target}`, reason });
    commitState(stateP, s);
    ok(`quarantine frozen: ${target} (-> ${branch}) - oracle refuses until: aegis quarantine clear ${target} --reason "<why>"`);
    return;
  }
  const i = s.quarantine.findIndex((r: any) => r.branch === branch || r.target === target ||
    r.branch === target || r.target === branch);
  if (i === -1) die(2, `not quarantined: ${target} (see: aegis quarantine list)`);
  const [cleared] = s.quarantine.splice(i, 1);
  const retained = (s.clean ?? {})[cleared.branch]?.cycles ?? (s.clean ?? {})[cleared.target]?.cycles ?? 0;
  s.history.push({ skill: s.current_skill, at, event: `quarantine-clear ${cleared.target}`, reason });
  commitState(stateP, s);
  ok(`quarantine cleared: ${cleared.target} (${retained} clean cycle(s) retained) - oracle re-armed`);
}
