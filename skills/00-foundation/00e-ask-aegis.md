---
name: 00e-ask-aegis
version: 0.6.0
triggers: [what next, blocked advisor, cold session orientation]
not-triggers: [menus of options, forcing past blockers]
inputs: [status output, next output, doctor drift notes]
outputs: [ONE recommended action with quoted evidence]
chains-to: next-per-status
autonomy: L1
tokens-budget: 800
---
# SKILL-00e: ASK-AEGIS (NEXT-ACTION ADVISOR)

## Overview
At ANY pipeline position, answer exactly one question — "what do I do next?" — with ONE recommended action and the command output behind it. Never a menu.

## When
- Agent or human is unsure, blocked, or returning to a cold session.
- Fast, evidence-backed orientation is needed.

## When-NOT
- `.aegis/` state is absent — the only honest advice is `aegis init`; stop there.
- Never force past a blocker; surface it verbatim.

## Process
- Read current skill, lanes, open fix, blockers (multi-app: add `--app`; bare status prints summary; missing state -> recommend init, STOP): `aegis status`
- Get the single recommended forward skill: `aegis next`
- Refresh the portable position snapshot and read it: `aegis status --markdown`
- Collect drift notes: `aegis doctor`
- Reconcile BEFORE new work: open fix -> close first, never layer on top: `aegis fix done`
- Reconcile BEFORE new work: open fix -> or abandon with reason: `aegis fix abandon --reason`
- Drift notes exist -> surface and reconcile before new work: `aegis doctor`
- Blocker names a gate -> prepare artifact, ask human to approve (only humans approve): `aegis gate`
- Otherwise recommend the ONE legal transition returned, pointing at the skill file to execute: `aegis transition`

## Verification
- Answer is exactly ONE action, with every state claim quoting its command line.
- Open fix and doctor drift checked before anything new.
- No invented command or state; anything without command output is UNMEASURED.

## Red Flags
- `aegis next` exits 3 (blocked) -> surface verbatim; never force.
- `aegis transition` exits 5 (loop/cycle) -> STOP; present the cycle to the human.

## Interactions
- CLI: `aegis status`, `aegis next`, `aegis doctor`, `aegis init`, `aegis fix`, `aegis gate`, `aegis transition`
- Brain: read `handoff.md`, context-window; write nothing (advisory only).
- Next: whatever `aegis next` recommends. Touchpoints: gate approval, loop/cycle escalation.
