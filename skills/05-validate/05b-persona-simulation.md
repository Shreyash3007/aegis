---
name: 05b-persona-simulation
version: 0.6.0
triggers: [persona walkthrough, adversarial simulation, a11y audit]
not-triggers: [ai-thinking-like-ai, unverified live claims]
inputs: [personas, user flows, codebase, threat model]
outputs: [ux flaw report, accessibility audit, security gap report]
chains-to: 05c-bug-hunting
autonomy: L1
tokens-budget: 800
---
# SKILL-05b: PERSONA-BASED ADVERSARIAL SIMULATION

## Overview
Walk every persona through every flow. Find confusion, dead ends, a11y violations, security bypasses.
Think like a real user — a mom, a 12-year-old, someone distracted on a train — not like an AI.

## When
- After 05a; personas defined, flows mapped, codebase exists.
- L0+: static walkthroughs (STATIC REVIEW — UNVERIFIED). L1+: live UI walks where configured.

## When-NOT
- Never present static walks as verified; live walks cite their run.
- Five personas always: confused, power, accessibility, malicious, impatient.

## Process
- Read all personas + user-flows.md: `aegis status`
- Per persona x flow: walk it; document confusion points, dead ends, cognitive-load violations: `aegis status`
- Accessibility simulation (contrast, focus order, labels, keyboard paths): `aegis status`
- Malicious simulation against the security-audit threat model (injection, enumeration, ID tampering, bypass): `aegis status`
- Generate reports; self-critique; present; advance: `aegis transition 05c`

## Verification
- Live walks cite their run; static walks labeled STATIC REVIEW — UNVERIFIED.
- Reports written: ux-flaw, accessibility-audit, security-gap.

## Red Flags
- Critical a11y violation or security bypass -> STOP, immediate fix escalation.

## Interactions
- CLI: `aegis validate e2e` (where configured), `aegis transition 05c`.
- Brain: read `personas/*`, `user-flows.md`; write the three quality reports.
- Next: `05c-bug-hunting`. Touchpoint: critical a11y/security finding.
