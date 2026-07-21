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
- Execution matrix defined; stack locked

## Environment Requirements
L1+ for lint/hook generation; document-only at L0.

## Execution Steps
1. Directory structure (feature-based).
2. File naming: feature-name.type.ts.
3. Function naming: camelCase, <=50 lines, JSDoc.
4. Import/export rules: path aliases, named exports only, no barrels.
5. Error handling: typed errors, try/catch at boundaries.
6. Logging: structured with trace IDs.
7. Testing: co-located, one expectation per test name.
8. Generate .eslintrc implementing the above.
9. Verify pre-commit hook enforces lint + tsc (installed by init).
10. Self-critique; present.

## Input Schema
- brain/roadmap/execution-matrix.md
- brain/context/manifest.md (locked stack)
- (brownfield) existing lint configs

## Measurement Citations
Enforcement claims cite the generated .eslintrc path and hook presence, not intent.

## Self-Critique Protocol (Standard)
"Would a new developer understand this in 1 day? Is any rule here ceremony
without benefit? Does the lint config actually encode these rules, or did I
write aspirational markdown?"

## Error Escalation Protocol
Convention conflicts with existing codebase (brownfield) -> ask:
adopt / adapt / hybrid. Never silently reformat a legacy tree.

## Output Schema
- .eslintrc (or stack equivalent)
- brain/architecture/standards.md

## CLI Contract
- Runtime: `aegis transition 04a` (blocked until `aegis contracts` verifies N1)
- Manual: human runs.

## Brain Files
Read: execution-matrix, manifest | Write: standards.md

## Next Skill
04a - requires contracts merged (N1, CLI-enforced)

## Human Touchpoints
Convention conflicts with team preference (APPROVAL tier).
