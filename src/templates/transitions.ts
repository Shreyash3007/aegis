import { Transitions } from '../lib/state.js';

/** The state machine, as data (brief 5.4). Docs render FROM this - diagram and
 *  enforcement can never disagree. Happy path + enumerated non-linear edges. */
export function defaultTransitions(): Transitions {
  const E = (from: string, to: string, extra?: object) => ({ from, to, ...extra });
  return {
    gates: { G1: 'arch-freeze', G2: 'security-signoff', G3: 'integration', G4: 'ship', PRD: 'prd-freeze' },
    max_loop: 3,
    edges: [
      // foundation
      E('00a', '00b'), E('00b', '00d'), E('00b', '01a'), E('00d', '01a'), E('00d', '07a'),
      // discover (PRD freeze is SACRED, A2)
      E('01a', '01b', { gate: 'PRD' }), E('01b', '01c'), E('01c', '02a'),
      // architect
      E('02a', '02b', { gate: 'G1' }), E('02b', '02c'), E('02c', '03a', { gate: 'G2' }),
      // plan
      E('03a', '03b'), E('03b', '04a', { requiresContracts: true }),
      // build
      E('04a', '04b'), E('04b', '04c'), E('04c', '05a', { gate: 'G3' }),
      // validate
      E('05a', '05b'), E('05b', '05c'), E('05c', '05d'), E('05d', '05e'), E('05e', '06b'),
      // review -> maintain
      E('06b', '07a'), E('06b', '08a'),
      E('07a', '07b'), E('07b', '07c'), E('07c', '08a'),
      // ship
      E('08a', '08b', { gate: 'G4' }), E('08b', '08c'), E('08c', '07a'),
      // orchestration / out-of-band (06d: budgets pre-build + at 05d; 06e: error escalation)
      E('03b', '06d'), E('05d', '06d'), E('06d', '04a'), E('06d', '07a'),
      E('04a', '06e'), E('04b', '06e'), E('04c', '06e'), E('05c', '06e'),
      // rollback edges (backward = reason required, loop-counted)
      E('06e', '04a', { backward: true }),
      // early-phase repair: post-freeze discoveries route back to the owning state
      E('01b', '01a', { backward: true }), // scope found PRD gap
      E('01c', '01a', { backward: true }), // design found PRD contradiction
      E('02a', '01b', { backward: true }), // architecture found scope infeasible
      E('02b', '02a', { backward: true }), // schema exposed arch flaw
      E('03a', '02b', { backward: true }), // planning found contract gap
      E('04b', '04a', { backward: true }),
      E('04c', '04b', { backward: true }),
      E('05a', '04a', { backward: true }),
      E('05d', '04a', { backward: true }),
      E('05e', '04a', { backward: true }),
      E('06b', '02a', { backward: true }),
      E('08a', '04a', { backward: true }),
      E('08a', '03a', { backward: true }), // perf budget unrealistic -> re-plan
      E('08a', '02c', { backward: true }),
      E('08a', '05c', { backward: true }),
      E('07a', '07a', { backward: true }), // periodic cycle
    ],
  };
}
