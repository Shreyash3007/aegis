---
name: 07c-documentation
version: 0.6.0
triggers: [api docs generation, runbook authoring, diagram refresh]
not-triggers: [aspirational diagrams, contradicting docs left standing]
inputs: [codebase, contracts, system design, observability spec]
outputs: [docs directory, documentation report]
chains-to: 08a-verdict
autonomy: L2
tokens-budget: 800
---
# SKILL-07c: DOCUMENTATION & RUNBOOKS

## Overview
Generate API docs, deployment guide, troubleshooting runbook, architecture diagrams — current, not aspirational.
Documentation is code; bad docs are bugs.

## When
- After 07b, or before 08a; contracts + observability spec defined.

## When-NOT
- Never aspirational diagrams; never paper over docs-vs-code contradictions — one of them is the bug.

## Process
- API docs from the OpenAPI contract (examples, error codes, rate limits): `aegis status`
- Deployment guide (steps + rollback + verification): `aegis status`
- Troubleshooting runbook (symptom, cause, fix, prevention per failure mode): `aegis status`
- Architecture diagrams FROM the module graph, never aspirational: `aegis ast build`
- README + onboarding guide; self-critique; present; advance: `aegis transition 08a`

## Verification
- Every claim verifiable against code or graph; diagrams cite graph generation; coverage cites contract endpoint counts.
- Self-check: new developer productive in 1 day? understandable in 6 months? diagrams match current graph?

## Red Flags
- Docs contradict code -> fix one, flag for human.

## Interactions
- CLI: `aegis ast build`, `aegis transition 08a`.
- Brain: read codebase, contracts, system, observability; write documentation-report.
- Next: `08a-verdict`. Touchpoint: docs revealing architectural inconsistency.
