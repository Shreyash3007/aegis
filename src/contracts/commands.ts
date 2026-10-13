/** N1 contracts for the aegis CLI itself (self-hosted brownfield): the exact
 *  command surface every skill file may cite, and the exit-code contract
 *  every gate depends on. Changed only through 02b review as a contract PR -
 *  the merge oracle refuses contract drift in slices, and
 *  test/contracts-self.test.js refuses runtime drift from this file. */

export const CONTRACT_COMMANDS: string[] = [
  'init', 'doctor', 'status', 'next', 'gate', 'transition', 'contracts',
  'loops', 'lane', 'checkpoint', 'resume', 'ast', 'sync', 'gc', 'config',
  'merge', 'slice', 'validate', 'monitor', 'eval', 'migrate', 'fix', 'chore',
  'import', 'update', 'exec', 'typecheck', 'hooks', 'wave', 'lint-skills',
  'clean', 'quarantine', 'memory', 'jev', 'demo',
];

/** Exit codes and their single meaning. Gates branch on these numbers. */
export const CONTRACT_EXITS: Record<number, string> = {
  0: 'ok',
  1: 'not a git repo',
  2: 'malformed call or missing state',
  3: 'blocked (no legal forward transition)',
  4: 'illegal action',
  5: 'loop/cycle escalation (human required)',
  6: 'integrity mismatch',
  7: 'gate error (proof-of-human failed)',
  8: 'ast cycles',
  9: 'merge/validate/refusal gate fired',
  10: 'monitor breach',
  11: 'eval failure (below threshold)',
  12: 'schema mismatch',
  13: 'nothing to merge (never a pass)',
};
