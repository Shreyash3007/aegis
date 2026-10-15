import fs from 'node:fs';
import { die } from './util.js';
import { loadState, acquireState, commitState, stateP } from './state.js';

/** Counts logical questions, not dollars or provider retries. Reservations
 * are atomic and never refunded on uncertain transport failures. */
export function reserveJudgments(count: number): void {
  if (!fs.existsSync(stateP) || !loadState().judgment_budget) return;
  const s = acquireState(stateP);
  const b = s.judgment_budget;
  if (!b) { commitState(stateP, s); return; }
  if (b.used + count > b.limit) {
    commitState(stateP, s);
    die(5, `judgment budget exhausted: ${b.used}/${b.limit}, requested batch ${count}; STOP and ask for a reviewed wave reset`);
  }
  b.used += count;
  s.history.push({ skill: s.current_skill, at: new Date().toISOString(), event: `judgment-reserved: ${count} (${b.used}/${b.limit})` });
  commitState(stateP, s);
}
