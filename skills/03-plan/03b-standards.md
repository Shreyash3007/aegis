# SKILL-03b: AI-NAVIGABLE STANDARDS

## Expert Persona
Staff Engineer (Google L5) who writes style guides. "If I can't find it in
30 seconds, the structure is wrong."

## Purpose
Enforce conventions that make AI navigation and human review effortless -
as lint config and git hooks, not as a document nobody reads.

## Trigger
After 03a.

## Entry Criteria
- Execution matrix defined; stack locked (brain/context/manifest.md)

## Environment Requirements
L1+ for lint/hook generation; document-only at L0.

## Input Schema
- brain/roadmap/execution-matrix.md
- brain/context/manifest.md (locked stack)
- (brownfield) existing lint configs to reconcile, never clobber

## Execution Steps
1. Directory structure: feature-based (organize by feature/domain, never by
   type). Each slice maps to one feature directory, so `aegis slice create`
   yields a self-contained tree a reviewer can diff in isolation.
2. File organization: many small files over few large ones. 200-400 lines
   typical, 800 max; split a file the moment it gains a second
   responsibility. High cohesion, low coupling.
3. File naming: feature-name.type.ts (e.g. market-card.component.ts,
   search.service.ts). One module, one default responsibility.
4. Naming conventions: functions/variables camelCase; booleans prefixed
   is/has/should/can; interfaces/types/components PascalCase; constants
   UPPER_SNAKE_CASE; hooks use*.
5. Immutability (locked rule): always return a new object, never mutate in
   place. update(src, field, value) returns a copy; mutation is a lint
   error, not a preference. Rationale: hidden side effects break parallel
   slices and turn mergeable diffs into conflicts that `aegis merge check`
   then surfaces.
6. Error handling: typed errors; explicit try/catch only at boundaries;
   user-facing messages friendly, server logs detailed; never swallowed.
7. Input validation: schema-validated at every system boundary (API entry,
   file import, webhook); fail fast; external data is UNTRUSTED (08c rule).
8. Logging: structured JSON with trace IDs; never log secrets (02c rule).
9. Code-smell guardrails: early returns over nesting >4 levels; named
   constants for magic numbers; functions <=50 lines with one job.
10. Testing discipline locked HERE (executed in 04a/05): co-located tests
    (.test.ts beside the module), one behavior per test, AAA structure
    (Arrange-Act-Assert), descriptive names ("returns empty list for empty
    query"). Three layers mandatory - unit, integration, E2E (critical flows)
    - with a minimum 80% coverage gate enforced at G3 via `aegis validate
    tests`. Tests are independent (each sets up its own data; no ordering).
11. Generate the lint config that encodes the above (.eslintrc or stack
    equivalent) - rules, not aspirations. Each numbered item maps to one
    enforceable lint rule.
12. Verify the pre-commit hook (installed by init) typechecks with tsc when
    TypeScript files exist (it skips cleanly on repos with no .ts files).
    The hook does NOT run lint - lint is enforced by the generated .eslintrc
    via editor integration / CI, keeping the hook fast.
13. Walk the locked-standards checklist below; each item must be answerable
    with a lint rule or a gate. Record any exception, with its reason, in
    standards.md - exceptions are reviewable, never silent.
14. Self-critique; present. These standards are now immutable for the slice
    phase - a slice that edits them is refused by `aegis merge check` (N3),
    the same protection contracts receive.

Locked-standards checklist (what the plan freezes for every slice):
- Immutability: no in-place mutation; spread/clone into a new object.
- File size: every file <=800 lines, one responsibility; 200-400 typical.
- Functions: <=50 lines, single job, early returns, named constants (no
  magic numbers), no nesting deeper than four levels.
- Exports: named exports only; path aliases; no barrel re-export churn.
- Boundaries: schema-validated inputs at every edge; UNTRUSTED external data.
- Tests: co-located, one behavior per test, AAA structure, independent;
  80% coverage gate at G3 (`aegis validate tests`).

## Self-Critique Protocol (Standard)
"Would a new developer understand this in 1 day? Is any rule here ceremony
without benefit? Does the lint config actually encode these rules - one
enforceable rule per item - or did I write aspirational markdown? Can a
slice agent follow this without asking me a question? Did I lock
immutability and the 80% coverage gate, or merely mention them?"

## Error Escalation Protocol
- Convention conflicts with existing codebase (brownfield) -> ask:
  adopt / adapt / hybrid. Never silently reformat a legacy tree.
- A desired rule cannot be expressed in the stack's linter -> record it as
  a manual review checkpoint in standards.md and flag it at 06b review.
- Coverage gate cannot be configured (no test runner) -> mark coverage
  UNMEASURED at G3; keep the 80% intent; route a gap task to 07a tech-debt.

## Output Schema
- .eslintrc (or stack equivalent) encoding every rule above
- brain/architecture/standards.md (the locked checklist + any deferred items)

## Measurement Citations
Enforcement claims cite the generated .eslintrc path and hook presence, not
intent. Coverage claims cite `aegis validate tests` at G3; else UNMEASURED.
File-size limits are countable ("N files > 800 lines").
Reference: ECC project (MIT), adapted.

## CLI Contract
- Runtime: `aegis transition 04a` (blocked until `aegis contracts` verifies N1)
- Manual: human runs.

## Brain Files
Read: execution-matrix, manifest | Write: standards.md

## Next Skill
04a - requires contracts merged (N1, CLI-enforced)

## Human Touchpoints
Convention conflicts with team preference (APPROVAL tier).
