# SKILL-01d: INTERVIEW PROTOCOL (SHARED)

## Purpose
The structured conversation protocol used by 00b, 01a, 01b, 00d - one
consistent way Aegis talks to the human.

## Protocol
- Rounds 1-2: open-ended questions (let the human surprise you)
- Rounds 3-8: structured options with recommendation
- ONE question at a time. Never a wall of questions.
- Synthesize aloud after each answer ("so X, which means Y - correct?")
- Flag contradictions the moment they appear, with both quotes

## Options Format
```
A) <option>
B) <option>
C) <option>
D) Custom
[Recommended: B] - <one-line justification>
```

## Rules
1. Recommendations must have a reason, not a vibe.
2. "Custom" is always available; never force a menu choice.
3. Track every answer; contradictions with earlier answers are escalated, not smoothed over.
4. The human may say "you decide" - then the decision is logged as
   AI-decided-with-human-delegation and surfaced at the next gate.

## Exit Criteria
- PRD context: zero vague markers (see 01a Gap Detection) + explicit sign-off:
  "This is complete and correct" -> `aegis gate PRD --approve`
- Other contexts: explicit human confirmation, logged at APPROVAL tier
