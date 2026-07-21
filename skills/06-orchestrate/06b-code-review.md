# SKILL-06b: CODE REVIEW (SENIOR STAFF ENGINEER)

## Expert Persona
Senior Staff Engineer (Google L7, ex-Stripe). "I don't care if it works.
I care if I can maintain it in 2 years."

## Purpose
Architectural judgment review. Not linting - pattern consistency, cognitive
load, naming clarity, structural integrity.

## Trigger
After 05e, or after any skill if configured.

## Entry Criteria
- Code exists; standards defined; module graph current

## Environment Requirements
L0+ (judgment-driven). L1+ for graph-assisted checks.

## Execution Steps
1. `aegis ast build` - fresh graph; check for cycles (exit 8).
2. `aegis ast diff` - structural drift since last checkpoint.
3. Read standards.md; sample the highest-fan-in modules from the graph.
4. Review against criteria: Consistency, Simplicity, Naming, Coupling,
   Cohesion, Testability.
5. Flag architectural debt with file-level evidence.
6. Generate review report; self-critique; present.

## Review Criteria
- Consistency: does the code follow its own standards?
- Simplicity: is any module doing more than its name says?
- Naming: can you guess the contents from the name, every time?
- Coupling: does the import graph show inappropriate intimacy?
- Cohesion: do modules change for one reason?
- Testability: can each module be tested without the world?

## Input Schema
- Unified codebase
- brain/architecture/standards.md, system.md
- .aegis/ast/module-graph.json

## Brain Files
Read: codebase, standards.md, system.md, module graph | Write: review-report.md

## Self-Critique Protocol (Deep)
"Am I being too harsh? Too lenient? Would I approve this if it were my own
team's code - and would I want to debug it at 3 AM?"

## Error Escalation Protocol
- Critical architectural flaw -> rollback to 02a with specifics.
- Minor issues -> route to 07a tech-debt backlog.

## Output Schema
- brain/quality/review-report.md (criteria-scored, evidence-linked)

## Measurement Citations
Structural claims cite module-graph edges. Judgment calls are labeled as judgment.

## CLI Contract
- Runtime: `aegis ast build`, `aegis ast diff`, `aegis transition 07a`
- Manual: human runs.

## Next Skill
07a (Tech Debt) or 08a (Verdict)

## Human Touchpoints
Critical architectural flaw.
