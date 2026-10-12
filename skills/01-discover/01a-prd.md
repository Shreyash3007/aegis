---
name: 01a-prd
version: 0.6.0
triggers: [adversarial prd, 01a requirements grill, persona definition]
not-triggers: [accepting vague answers, inventing personas]
inputs: [locked manifest, product docs, brownfield inferred docs]
outputs: [frozen PRD, evidence-based personas]
chains-to: 01b-scope
autonomy: L1
tokens-budget: 1200
---
# SKILL-01a: PRD & PERSONAS (ADVERSARIAL)

## Overview
Capture complete, unambiguous requirements through relentless grilling.
Zero hallucination. Zero gaps. Treats "we'll see" as a bug.

## When
- After 00b (greenfield) or 00d (brownfield) completes.
- Manifest locked and developer ready to answer.

## When-NOT
- Never accept a vague answer, invent a persona, or fill a gap with your own assumption.
- Never proceed past open gaps; the freeze gate will refuse anyway.

## Process
- Open discovery rounds 1-2 ("what problem", "who has it"); synthesize draft PRD + candidate personas: `aegis status`
- Adversarial mode: read your own PRD as a hostile engineer; flag EVERY gap with the detection rules: `aegis status`
- Per gap ask ONE sharp question (rotate the question bank); update PRD on answer; re-scan: `aegis status`
- Repeat until ZERO gaps in 3 consecutive scans; define anti-goals; present frozen PRD + personas: `aegis gate PRD --approve`
- Gap-free claim cites scan count in the PRD footer ("0 gaps in 3 consecutive scans"): `aegis gate PRD --approve`
- Human approves (SACRED, human-only, never auto-approved); then advance: `aegis transition 01b`

## Verification
- Every feature has acceptance criteria, error states, edge cases, constraints.
- Personas are evidence-based; no invented persona survives self-critique.
- Self-check: vague answer accepted? persona invented? gap filled by assumption? any engineer-misreadable sentence?

## Red Flags
- Developer refuses after 3 attempts -> halt: "Insufficient input for reliable PRD", human escalation.
- Gap signals on sight: "TBD", "maybe", "we'll see", "probably", "etc.", vague numbers, missing edge cases, undefined error states, unspecified constraints, missing dependencies, unspecified data lifetime.
- Question bank: failure behavior, millisecond definitions, non-users, opposite actions, data before/after, API-down, 2G, double-click.

## Interactions
- CLI: `aegis gate PRD --approve` (human only), then `aegis transition 01b`
- Brain: read manifest (+ brownfield `architecture/*`); write `personas/*`, `roadmap/prd.md` (FROZEN after gate).
- Next: `01b-scope`, CLI-blocked until the PRD gate is approved. Touchpoints: SACRED PRD freeze, persona confirmation.
