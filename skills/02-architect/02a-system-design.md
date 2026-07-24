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
2. Identify core entities and relationships; for each entity name its owner
   (the one service that writes it) and its readers. An entity with more than
   one writer is a contention risk - call it out now, do not paper over it.
3. Design data flow: for every path name the producer, the consumer, the
   transport (sync HTTP, queue, stream), the failure mode, and the recovery.
   Draw producer -> transport -> consumer and put a failure note on every
   arrow - an arrow with no failure story is an open risk you must resolve.
4. Set component boundaries along the repository -> service -> controller
   seam: data access behind a repository interface, business logic in a
   service layer, HTTP concerns in the route/controller. Nothing reaches
   across a layer except through its declared interface.
5. Define API boundaries, pagination, and the error model (see checklist);
   caching strategy (see checklist); async processing (see checklist). These
   become 02b contracts and are immutable after N1 - pin them now.
6. Apply anti-fragility patterns (below).
7. Apply AI-navigability standards (below).
8. Write an ADR for every significant choice (template:
   brain/_templates/decision-record.md): context, options considered, the
   decision, and the rejection rationale for each discarded option.
9. Self-critique, then present.

## Anti-Fragility Patterns
- No God Objects: >300 lines = split.
- No Circular Dependencies: DAG only - verified by `aegis ast build` (exit 8),
  not by eye. A cycle found here goes to Error Escalation, not the backlog.
- Explicit over Implicit. Boundary Guards. Fail-Safe Defaults.
- Idempotent writes where possible: a retried POST must not double-create
  (idempotency key or unique constraint).
- Fail closed: on dependency error default to the safe state (deny, queue,
  serve stale) - never fail open on an auth or money path.

Concrete checklist (each item answered in system.md with evidence):
- Layers: repository, service, controller separated; no controller queries the
  DB directly; no service knows about HTTP status codes.
- N+1 queries: every list path batch-loads relations (one query for N parents,
  one for M children), never a loop of single fetches.
- Transactions: multi-step writes are wrapped so a failure rolls everything
  back; partial state is impossible.
- Retries: external calls use bounded exponential backoff with jitter and a
  retry budget so a failing downstream cannot amplify load.
- Backpressure: every queue has a max depth; when full the producer is told
  (429 / 503) rather than growing memory without bound.

Boundaries, API contract, caching (set these now - 02b/02c and the N1
contracts inherit them, and changing them in a slice is a forbidden contract
mutation):
- Resources are plural nouns, kebab-case, no verbs in the path
  (/api/v1/team-members). Actions outside CRUD use a sub-resource verb
  (POST /api/v1/orders/:id/cancel) sparingly.
- HTTP semantics: GET (safe, idempotent), PUT (full replace, idempotent),
  PATCH (partial), DELETE (idempotent), POST (create / trigger). Status codes
  are semantic: 201 + Location on create, 204 on delete, 409 on conflict, 422
  on semantic validation failure, 503 + Retry-After on overload - never 200
  for everything.
- Pagination: cursor-based for feeds and large sets (stable under concurrent
  inserts, constant performance); offset only for small admin views that need
  jump-to-page-N. Fetch limit+1 to compute has_next. Record the choice per
  endpoint in the contract.
- Error envelope: one shape - { error: { code, message, details? } }. Field
  validation returns details[] with field + message + code. A 500 never leaks
  internals (no stack, no SQL) to the client; full detail goes to server logs.
- Versioning: URL path (/api/v1/). Non-breaking changes (new optional fields,
  new endpoints) need no new version; breaking changes (rename, type change,
  removed field) require a new version plus a deprecation plan.
- Caching: state what is cached, where (HTTP headers -> CDN/edge -> Redis ->
  in-memory, cheapest that meets freshness), the TTL, and the invalidation
  trigger. A cache with no invalidation plan is a correctness bug. TTL is the
  safety net; invalidation is the rule. Authorized responses are never cached
  under a shared key - per-user data keys include the user id or are private.
  Serving stale-on-error is an explicit, labeled decision, not an accident.
- Async/queues: move slow or non-critical work (indexing, notifications,
  recompute) to a background queue and return 202 Accepted, not the result.
  Pick durability (a real broker vs an in-process array) matching the cost of
  losing the job. Rate limiting sits behind a shared store (Redis/gateway),
  never a per-process counter that resets on deploy and splits across replicas.

## AI-Navigability Standards
- Feature-based directories (/features/user-auth/).
- Files: feature-name.type.ts. Functions: camelCase, <=50 lines, JSDoc + throws.
- Every module: README.md. No barrel exports. Max file 300 lines.
- One responsibility per module: a name that needs "and" to describe it is two
  modules.

## Self-Critique Protocol (Deep)
"Would this fail at 10x scale? What is the single point of failure? Can a
junior understand this? Which box on my diagram has no failure story? Which
endpoint has no pagination plan? Which cache has no invalidation plan? Is
this simpler than it needs to be, or simpler than it can safely be?"

## Error Escalation Protocol
- Architecture violates the locked manifest -> rollback to 01b with specifics
  (the `aegis transition 01b --reason` path).
- Circular dependency found (`aegis ast build` exit 8) -> report the cycle
  path and redesign the seam; do not proceed to 02b until the DAG is clean.
- Contract-shaping decision deferred (pagination or error model undecided) ->
  block: 02b cannot produce contracts until these are pinned.
- Complexity exceeds V1 scope -> flag for scope reduction, don't gold-plate.

## Output Schema
- brain/architecture/system.md: component map; data flow with a failure story
  on every arrow; layer boundaries; API decisions (pagination per endpoint,
  error envelope, versioning); caching strategy (what/where/TTL/invalidation);
  async/queue choices.
- brain/architecture/decisions.md (ADRs, one per significant choice, with
  rejected-option rationale).

## Measurement Citations
Brownfield cross-checks cite module-graph paths from `aegis ast build`. DAG
cleanliness is the exit-8 result of that command - cite it, never assert it.
No invented benchmarks; any capacity claim is labeled UNMEASURED.
Reference: ECC project (MIT), adapted.

## CLI Contract
- Runtime: `aegis ast build` (brownfield), `aegis transition 02b` (blocked until G1)
- Human: `aegis gate G1 --approve` after review

## Brain Files
Read: v1-scope, design-system, manifest | Write: architecture/system.md, decisions.md

## Next Skill
02b - CLI-blocked until SACRED G1 approved

## Human Touchpoints
**SACRED GATE G1: Architecture freeze.** Never auto-approved.
