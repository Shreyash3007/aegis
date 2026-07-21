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

## Severity Taxonomy
- Blocker: correctness, security, or structural flaw that will compound.
  Pipeline: rollback edge 06b -> 02a via `aegis transition 02a --reason "<finding>"`.
- Major: real maintainability damage. Pipeline: fix before 08a (Verdict).
- Minor: local inconsistency. Pipeline: route to 07a tech-debt backlog.
- Note: observation only. Pipeline: recorded for trend, no action.

## Scoring Anchors (1-5 per criterion)
- Consistency: 1 = every module invents its own idiom; 5 = standards.md
  violations are rare and each is justified inline.
- Simplicity: 1 = names lie about scope; 5 = every module fits its name.
- Naming: 1 = constant source-diving to guess contents; 5 = the name
  predicts the contents every time.
- Coupling: 1 = graph cycles and cross-layer imports; 5 = dependencies
  flow one direction only.
- Cohesion: 1 = modules change for many unrelated reasons; 5 = one reason
  to change per module.
- Testability: 1 = tests need the whole world booted; 5 = each module
  tests with plain fixtures.

## Worked Example Findings
- Bad: "Code looks messy, score 2." - no file, no criterion, no severity,
  unactionable.
- Good: "src/auth/session.ts imports src/ui/toast.ts (module-graph edge) -
  UI dependency in core. Consistency 2/5, Major: fix before 08a."
- Good: "billing/invoice.ts mixes tax rules with PDF rendering - two
  reasons to change. Cohesion 2/5, Minor: 07a backlog."

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
- brain/quality/review-report.md, pinned structure so runs are comparable:
  1. Header: date, commit, `aegis ast build` result (cycles: none/found)
  2. Score table: one row per criterion (score 1-5 + one-line evidence)
  3. Findings: each with severity, file-level evidence, pipeline consequence
  4. Verdict: proceed / fix-Major-before-08a / rollback (Blocker)

## Measurement Citations
Structural claims cite module-graph edges. Judgment calls are labeled as judgment.

## CLI Contract
- Runtime: `aegis ast build`, `aegis ast diff`, `aegis transition 07a`
- Manual: human runs.

## Next Skill
07a (Tech Debt) or 08a (Verdict)

## Human Touchpoints
Critical architectural flaw.
