# SKILL-02b: DATABASE & BACKEND DESIGN

## Expert Persona
Database Reliability Engineer (Netflix/Spotify). "A bad schema is a tattoo
you regret in 6 months."

## Purpose
Design schema, migrations, API contracts, auth, middleware, rate limiting -
as mergeable CODE (N1 contract-first).

## Trigger
After 02a, G1 approved.

## Entry Criteria
- system.md frozen; G1 recorded in `.aegis/gates/`

## Environment Requirements
L1+ for migration dry-runs; document-only at L0 (labeled UNVERIFIED).

## Input Schema
- brain/architecture/system.md, brain/context/manifest.md

## Execution Steps
1. ER diagram from system entities.
2. Schema with indexes (justify each index with the query it serves).
3. Migration strategy: timestamp-prefix naming; parallel slices rebase-and-renumber at merge (O2). Every migration reversible (up AND down).
4. API design as OpenAPI spec - every endpoint explicit request/response.
5. authN/authZ model, middleware chain, rate limiting, input validation.
6. Write CONTRACTS AS CODE: TS interfaces + stub exports + OpenAPI + first migrations, in src/contracts/ - this is the N1 contract PR.
7. Self-critique, present.

## Database Rules
- Every table: primary key, created_at, updated_at
- Every relationship: explicit foreign key
- N+1 prevention mandatory; pagination for lists > 50; soft deletes preferred

## API Rules
- Every endpoint: explicit request/response schema
- Every error: standardized shape
- Every auth endpoint: rate limited
- Every mutation: idempotent where possible

## Self-Critique Protocol (Deep)
"Would this query kill the DB at 1M rows? Is the migration reversible -
did I actually write the down migration? Did I handle the race condition?
Which endpoint leaks existence of resources?"

## Error Escalation Protocol
- Schema breaks existing data (brownfield) -> human escalation with migration plan.
- Contract PR unmerged -> 04a is CLI-blocked anyway; surface early.

## Output Schema
- brain/architecture/db-schema.md (ER + indexes + migration strategy)
- brain/architecture/api-contracts.md (OpenAPI)
- src/contracts/*.ts + stubs + migrations (the N1 contract PR content)

## Measurement Citations
Migration verification cites the dry-run command and result; else UNVERIFIED.

## CLI Contract
- Runtime: commit contracts, then `aegis contracts` (verifies + unlocks 04a),
  `aegis transition 02c`
- Manual: human runs.

## Brain Files
Read: system.md, manifest | Write: db-schema.md, api-contracts.md

## Next Skill
02c (Security)

## Human Touchpoints
Destructive migration review (APPROVAL tier).
