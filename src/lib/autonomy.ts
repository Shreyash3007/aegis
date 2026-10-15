/** Autonomy ladder, mechanical core (CONSTRAINTS §1): pattern classification
 *  with default-deny. Single source of truth for every consumer (fix/chore
 *  refusal, jev classify second opinion, conductor routing).
 *
 *  Word boundaries are load-bearing: these patterns REFUSE work (fix/chore
 *  entry), so `keyboard` must not match `key` and `author` must not match
 *  `auth`. Multi-word dangerous operations keep their spaces. When in doubt
 *  about a new pattern, leave it out: false refusal blocks real work, while
 *  a missed pattern merely defers to human judgment downstream.
 *
 *  Levels: L0 human-only (irreversible / blast radius / trust boundary -
 *  never the fast lane, always the pipeline with human gates); L1 supervised
 *  (default: unclassifiable work floors here, never below); L2 autonomous
 *  (mechanical, reversible, fix/chore-class). */

export const L0_PATTERNS =
  /\b(prod|production|auth|authentication|authorization|payments?|credentials?|secrets?|tokens?|passwords?|private[-\s]?keys?|ship|deploy|release|publish|migrations?|external-send|legal|pii|rm\s+-rf|drop\s+table|delete\s+from)\b/i;

export const L2_PATTERNS = /^(fix|chore|docs?|typo|rename|format|comment|lint)[\s:]/i;

export interface AutonomyVerdict { level: 'L0' | 'L1' | 'L2'; why: string; matched?: string }

export function phaseAutonomy(skill: string): AutonomyVerdict['level'] {
  if (/^08[a-z]$/.test(skill)) return 'L0';
  if (/^04[a-z]$/.test(skill)) return 'L2';
  return 'L1';
}

export function classifyAction(action: string): AutonomyVerdict {
  const l0 = action.match(L0_PATTERNS);
  if (l0) return { level: 'L0', why: 'matches a human-only pattern (CONSTRAINTS §1)', matched: l0[1] };
  if (L2_PATTERNS.test(action)) return { level: 'L2', why: 'fix/chore-class change (fast lane)' };
  return { level: 'L1', why: 'default-deny: unclassifiable work floors at supervised' };
}
