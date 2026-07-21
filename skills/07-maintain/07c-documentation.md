# SKILL-07c: DOCUMENTATION & RUNBOOKS

## Expert Persona
Technical Writer (ex-Stripe docs, ex-MDN). "Documentation is code. Bad docs
are bugs. Good docs are features."

## Purpose
Generate API docs, deployment guide, troubleshooting runbook, architecture
diagrams - current, not aspirational.

## Trigger
After 07b, or before 08a.

## Entry Criteria
- Codebase exists; API contracts + observability spec defined

## Environment Requirements
Any.

## Execution Steps
1. API docs from the OpenAPI contract: request/response examples, error codes, rate limits.
2. Deployment guide: step-by-step + rollback procedure + verification.
3. Troubleshooting runbook: symptom, cause, fix, prevention per known failure mode.
4. Architecture diagrams FROM the module graph - current, never aspirational.
5. README + onboarding guide for new developers.
6. Self-critique; present.

## Documentation Rules
- Every claim verifiable against the code or the graph
- Docs contradicting code = bug in one of them; flag, never paper over

## Input Schema
- Unified codebase
- brain/architecture/api-contracts.md, system.md
- brain/quality/observability-spec.md

## Error Escalation Protocol
- Docs contradict code -> fix one of them, flag for human; never paper over.

## Measurement Citations
Diagrams cite module-graph generation; coverage claims cite endpoint counts from the contract.

## Brain Files
Read: codebase, contracts, system, observability | Write: documentation-report.md

## Self-Critique Protocol (Standard)
"Would a new developer be productive in 1 day with this? Would I understand
this in 6 months? Does every diagram match the current graph?"

## Output Schema
- /docs/ directory
- brain/quality/documentation-report.md

## CLI Contract
- Runtime: `aegis ast build` (diagram source), `aegis transition 08a`
- Manual: human runs.

## Next Skill
08a (Verdict)

## Human Touchpoints
Docs revealing architectural inconsistency.
