---
name: 01d-interview-protocol
version: 0.6.0
triggers: [interview protocol, structured conversation, one question at a time]
not-triggers: [question walls, forced menu choices]
inputs: [human answers, prior context]
outputs: [logged answers, contradiction flags, sign-offs]
chains-to: calling-skill
autonomy: L1
tokens-budget: 500
---
# SKILL-01d: INTERVIEW PROTOCOL (SHARED)

## Overview
The structured conversation protocol used by 00b, 01a, 01b, 00d — one consistent way Aegis talks to the human.

## When
- Any skill needs human answers (requirements, scope, confirmation).
- Recommendations require reasons, not vibes.

## When-NOT
- Never a wall of questions; never force a menu choice ("Custom" always exists).
- Never smooth over contradictions; escalate with both quotes.

## Process
- Rounds 1-2: open-ended questions; let the human surprise you: `aegis status`
- Rounds 3-8: structured options with recommendation (A/B/C/D-Custom + `[Recommended]` + one-line why): `aegis status`
- ONE question at a time; synthesize aloud after each answer ("so X, which means Y — correct?"): `aegis status`
- Flag contradictions the moment they appear: `aegis status`
- "You decide" -> log as AI-decided-with-human-delegation, surface at next gate: `aegis status`
- PRD context exit: zero vague markers + explicit "This is complete and correct" sign-off: `aegis gate PRD --approve`

## Verification
- Every answer tracked; every recommendation reasoned.
- Delegated decisions surfaced at the next gate, never buried.
- Other contexts exit on explicit human confirmation, logged at APPROVAL tier.

## Red Flags
- Forced choice without Custom option -> protocol violation, redo the round.
- Unsurfaced delegation -> gate cannot pass.

## Interactions
- CLI: `aegis gate PRD --approve` (PRD context); host skill's transition otherwise.
- Brain: answers live in the calling skill's artifacts.
- Next: the calling skill. Touchpoint: every sign-off.
