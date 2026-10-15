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
- Team review (ONE shared brief, not a waterfall relay): PM, design, and engineering lead; add frontend/backend/QA/challenger lenses when the risk warrants them, or record why a lens is not applicable. Reuse `04-build/team-templates/base-roles/`: `aegis status`
- Independent challenge: each lens records evidence, assumptions, and the strongest alternative before synthesis; agreement names what was checked; never invent objections just to disagree: `aegis status`
- Conceptual model before screens: agree objects/actions/flows with the backend voice first; UI voice maps flows + ALL states after: `aegis status`
- Consequential splits become assumption tests with owners (never seniority wins); trivial splits defer to the most relevant lens AFTER all views are heard: `aegis status`
- Adversarial mode: read your own PRD as a hostile engineer; flag EVERY gap with the detection rules: `aegis status`
- Per gap ask ONE sharp question (rotate the question bank); update PRD on answer; re-scan: `aegis status`
- Repeat until ZERO gaps in 3 consecutive scans; define anti-goals; present frozen PRD + personas: `aegis gate PRD --approve`
- Traceability: every load-bearing requirement links evidence or an explicitly labelled assumption; record decisions with cites, never simulated customer research. Unresolved debates stay open: `aegis memory add`
- Gap-free claim cites scan count in the PRD footer ("0 gaps in 3 consecutive scans"): `aegis gate PRD --approve`
- Human approves (SACRED, human-only, never auto-approved); then advance: `aegis transition 01b`

## Verification
- Every feature has acceptance criteria, error states, edge cases, constraints.
- Personas are evidence-based; no invented persona survives self-critique.
- Debate log present: every objection dispositioned (answered, tested, or scoped out); no repeated dead objections.
- Self-check: vague answer accepted? persona invented? gap filled by assumption? any engineer-misreadable sentence? agreement without evidence?

## Red Flags
- Developer refuses after 3 attempts -> halt: "Insufficient input for reliable PRD", human escalation.
- Gap signals on sight: "TBD", "maybe", "we'll see", "probably", "etc.", vague numbers, missing edge cases, undefined error states, unspecified constraints, missing dependencies, unspecified data lifetime.
- Question bank: failure behavior, millisecond definitions, non-users, opposite actions, data before/after, API-down, 2G, double-click.

## Interactions
- CLI: `aegis gate PRD --approve` (human only), then `aegis transition 01b`
- Brain: read manifest (+ brownfield `architecture/*`); write `personas/*`, `roadmap/prd.md` (FROZEN after gate).
- Next: `01b-scope`, CLI-blocked until the PRD gate is approved. Touchpoints: SACRED PRD freeze, persona confirmation.
