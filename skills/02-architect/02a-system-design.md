---
name: 02a-system-design
version: 0.6.0
triggers: [system design, architecture freeze g1, adr authoring]
not-triggers: [cyclic dependencies, god objects, deferred contracts]
inputs: [v1 scope, design system, manifest, brownfield graph]
outputs: [system.md, ADRs with rejected rationale]
chains-to: 02b-database
autonomy: L1
tokens-budget: 1500
---
# SKILL-02a: SENIOR SYSTEM DESIGN

## Overview
Design system architecture that is anti-fragile, scalable, and AI-navigable.
The best architecture is explainable to a junior in five minutes.

## When
- After 01c; V1 scope frozen, design system defined, manifest locked.
- Brownfield cross-checks via graph (L1+).

## When-NOT
- Never paper over multi-writer entities, arrows without failure stories, or unpinned contracts.
- Complexity beyond V1 scope is flagged for reduction, never gold-plated.

## Process
- Restate scope in one paragraph; if impossible, stop and ask: `aegis status`
- Name per-entity owner (single writer) and readers; multi-writer = contention risk, called out now: `aegis status`
- Design data flow (producer, transport, failure mode, recovery per path; failure note on EVERY arrow): `aegis status`
- Set layer seams (repository/service/controller, declared interfaces only): `aegis status`
- Pin API boundaries, pagination, error model, caching, async now (immutable after N1, inherited by 02b/contracts): `aegis status`
- Apply anti-fragility patterns (no God Objects >300 lines; DAG only; explicit; fail-safe; idempotent writes; fail closed on auth/money): `aegis ast build`
- Apply AI-navigability (feature dirs; typed files; small functions; module READMEs; no barrels; <=300-line files): `aegis ast build`
- Write one ADR per significant choice (context, options, decision, rejection rationale): `aegis checkpoint`
- Self-critique, present, advance only on SACRED G1 approval: `aegis transition 02b`

## Verification
- Checklist answered with evidence: layers separated; list paths batch-load (no N+1); multi-step writes transactional; bounded retries with budget; queues depth-capped with 429/503 backpressure.
- API rules: plural kebab-case resources; semantic verbs/status (201+Location, 204, 409, 422, 503+Retry-After); cursor pagination for feeds (limit+1 for has_next); one error envelope `{error:{code,message,details?}}`, 500s never leak internals; URL versioning, breaking change = new version + deprecation plan.
- Cache rules: what/where/TTL/invalidation stated; TTL is safety net, invalidation the rule; authorized responses never under shared keys; stale-on-error explicit and labeled.
- Async rules: slow work to queues with 202; broker durability matches job-loss cost; rate limits behind shared store.
- DAG cleanliness = exit-8 result of the graph command, cited never asserted; capacity claims without measurement labeled UNMEASURED.

## Red Flags
- Architecture violates locked manifest -> rollback with specifics: `aegis transition 01b --reason`
- Cycle found (exit 8) -> report path, redesign seam; no 02b until DAG clean.
- Pagination/error model undecided -> block: 02b cannot start.

## Interactions
- CLI: `aegis ast build` (brownfield), `aegis transition 02b` (G1-blocked); human: `aegis gate G1 --approve`.
- Brain: read v1-scope, design-system, manifest; write `architecture/system.md`, `decisions.md`.
- Next: `02b-database`. Touchpoint: SACRED G1, never auto-approved.
