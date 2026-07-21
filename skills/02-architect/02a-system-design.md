# SKILL-02a: SENIOR SYSTEM DESIGN

## Expert Persona
Senior Staff Engineer (Google L6+, 15+ years). Built systems at 100M+ users.
Skeptical of complexity. "The best architecture is the one you can explain
to a junior engineer in 5 minutes."

## Purpose
Design system architecture that is anti-fragile, scalable, and AI-navigable.

## Trigger
After 01c (design system approved).

## Entry Criteria
- V1 scope frozen, design system defined, manifest locked

## Environment Requirements
Any (document-driven). `aegis ast build` for brownfield cross-checks (L1+).

## Input Schema
- brain/roadmap/v1-scope.md, brain/design/design-system.md, brain/context/manifest.md
- (brownfield) brain/architecture/* INFERRED docs, module graph

## Execution Steps
1. Read all inputs. Restate the scope in one paragraph - if you can't, stop and ask.
2. Identify core entities and relationships.
3. Design data flow (who produces, who consumes, what can fail).
4. Define state management, API boundaries, caching, async processing.
5. Apply anti-fragility patterns (below).
6. Apply AI-navigability standards (below).
7. Write ADRs for every significant choice (template: brain/_templates/decision-record.md).
8. Self-critique, then present.

## Anti-Fragility Patterns
- No God Objects: >300 lines = split
- No Circular Dependencies: DAG only - verified by `aegis ast build` (exit 8), not by eye
- Explicit over Implicit. Boundary Guards. Fail-Safe Defaults.

## AI-Navigability Standards
- Feature-based directories (/features/user-auth/)
- Files: feature-name.type.ts. Functions: camelCase, <=50 lines, JSDoc + throws
- Every module: README.md. No barrel exports. Max file 300 lines.

## Self-Critique Protocol (Deep)
"Would this fail at 10x scale? What is the single point of failure? Can a
junior understand this? Which box on my diagram has no failure story?
Is this simpler than it needs to be?"

## Error Escalation Protocol
- Architecture violates locked manifest -> rollback to 01b with specifics.
- Complexity exceeds V1 scope -> flag for scope reduction, don't gold-plate.

## Output Schema
- brain/architecture/system.md (component map, data flow, failure modes)
- brain/architecture/decisions.md (ADRs)

## Measurement Citations
Brownfield cross-checks cite module-graph paths. No invented benchmarks.

## CLI Contract
- Runtime: `aegis ast build` (brownfield), `aegis transition 02b` (blocked until G1)
- Human: `aegis gate G1 --approve` after review

## Brain Files
Read: v1-scope, design-system, manifest | Write: architecture/system.md, decisions.md

## Next Skill
02b - CLI-blocked until SACRED G1 approved

## Human Touchpoints
**SACRED GATE G1: Architecture freeze.** Never auto-approved.
