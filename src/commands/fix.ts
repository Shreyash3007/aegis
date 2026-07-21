import { die, ok, writeJ } from '../lib/util.js';
import { loadState, stateP, FixRecord } from '../lib/state.js';
import { checkpoint } from './persist.js';
import { runSuite } from './validate.js';

/** Fast lane (v0.3): the pipeline has exactly one change size (PRD -> gates ->
 *  contracts -> slices -> ship), which prices a typo fix the same as a new
 *  feature. The fix/chore track is the honest alternative: the pipeline state
 *  (current_skill) is NOT touched, the change is recorded with its class, and
 *  `fix done` still requires the tests suite to pass (or honestly report
 *  UNMEASURED). Enforcement = recorded, sized gates - not uniform gates.
 *  Abuse (a "fix" that is really a feature) stays visible in the log. */

function open(s: ReturnType<typeof loadState>, rec: FixRecord): void {
  s.fix ??= { active: null, log: [] };
  if (s.fix.active)
    die(4, `fix already open: "${s.fix.active.desc}" - run aegis fix done / abandon first`);
  s.fix.active = rec;
  s.history.push({ skill: s.current_skill, at: rec.opened_at, event: `fix-start: ${rec.desc}` });
  writeJ(stateP, s);
  checkpoint(['--quiet']);
  ok(`fix open: "${rec.desc}" - work, then: aegis fix done`);
}

export function fix(args: string[]): void | Promise<void> {
  const sub = args[0];
  if (sub === 'start') {
    const desc = args.slice(1).join(' ').trim();
    if (!desc) die(2, 'usage: aegis fix start <description>');
    open(loadState(), { kind: 'fix', desc, opened_at: new Date().toISOString() });
    return;
  }
  if (sub === 'done') return done();
  if (sub === 'abandon') {
    const s = loadState();
    if (!s.fix?.active) die(4, 'no open fix');
    const ri = args.indexOf('--reason');
    const reason = ri !== -1 ? args[ri + 1] : undefined;
    if (!reason) die(4, 'fix abandon requires --reason <text> (audited)');
    const rec = s.fix.active;
    rec.closed_at = new Date().toISOString();
    rec.abandoned_reason = reason;
    s.fix.log.push(rec);
    s.fix.active = null;
    s.history.push({ skill: s.current_skill, at: rec.closed_at, event: 'fix-abandon', reason });
    writeJ(stateP, s);
    checkpoint(['--quiet']);
    ok(`fix abandoned (recorded): ${reason}`);
    return;
  }
  die(2, 'usage: aegis fix <start <desc>|done|abandon --reason t>');
}

async function done(): Promise<void> {
  const s = loadState();
  if (!s.fix?.active) die(4, 'no open fix - start one: aegis fix start <desc>');
  const rec = s.fix.active;
  // The one gate the fast lane keeps: the test suite must not be red.
  // UNMEASURED (no test script) closes honestly and says so in the record.
  const r = await runSuite('tests');
  const verdict = r ? `${r.status} (${r.command})` : 'UNMEASURED (tests suite unavailable)';
  if (r?.status === 'FAIL')
    die(9, `fix NOT closed - tests FAIL: ${r.summary}\n  fix stays open; repair, then aegis fix done again`);
  rec.closed_at = new Date().toISOString();
  rec.validation = verdict;
  s.fix!.log.push(rec);
  s.fix!.active = null;
  s.history.push({ skill: s.current_skill, at: rec.closed_at, event: `fix-done: ${rec.desc} [${verdict}]` });
  writeJ(stateP, s);
  checkpoint(['--quiet']);
  ok(`fix closed: "${rec.desc}" - validation: ${verdict}`);
}

/** Chores (docs/config/rename-class changes): single command, no lifecycle,
 *  no validation - checkpoint + record. */
export function chore(args: string[]): void {
  const desc = args.join(' ').trim();
  if (!desc) die(2, 'usage: aegis chore <description>');
  const s = loadState();
  const at = new Date().toISOString();
  const rec: FixRecord = { kind: 'chore', desc, opened_at: at, closed_at: at, validation: 'not required (chore class)' };
  s.fix ??= { active: null, log: [] };
  s.fix.log.push(rec);
  s.history.push({ skill: s.current_skill, at, event: `chore: ${desc}` });
  writeJ(stateP, s);
  checkpoint(['--quiet']);
  ok(`chore recorded: "${desc}"`);
}
