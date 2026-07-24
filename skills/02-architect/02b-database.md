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
1. ER diagram from system entities; every relationship explicit.
2. Schema with indexes (justify each index with the query it serves).
3. Migration strategy: timestamp-prefix naming; parallel slices rebase-and-renumber at merge (O2). Every migration reversible (up AND down).
4. Migration safety review against the checklist (see Database Rules):
   concurrent index builds, nullable/default new columns, schema/data split,
   and a dry-run against prod-sized data.
5. For destructive or structural changes, define the expand-contract plan:
   EXPAND (add nullable column/table, app writes both old AND new) ->
   MIGRATE (backfill in batches, app reads new/writes both) -> CONTRACT (app
   uses new only, drop the old column in a SEPARATE later migration).
6. API design as OpenAPI spec - every endpoint explicit request/response.
7. authN/authZ model, middleware chain, rate limiting, input validation.
8. Write CONTRACTS AS CODE: TS interfaces + stub exports + OpenAPI + first
   migrations, in src/contracts/ - this is the N1 contract PR.
9. Self-critique, present.

## Database Rules
- Every table: primary key, created_at, updated_at.
- Every relationship: explicit foreign key.
- N+1 prevention mandatory; pagination for lists > 50; soft deletes preferred.
- Every change is a migration - never alter a database by hand.
- Migrations are immutable once deployed - never edit one that has run in
  production; ship a new forward migration instead.
- Schema (DDL) and data (DML) migrations are separate - never mix in one file.
- New columns are nullable or have a default - never add NOT NULL without a
  default (it rewrites and locks the table).
- Indexes on existing tables use CREATE INDEX CONCURRENTLY (cannot run inside
  a transaction; most tools need a custom/empty migration for it).
- Large backfills are batched (FOR UPDATE SKIP LOCKED, fixed batch size) -
  never a single UPDATE/INSERT spanning all rows.
- Every migration has a rollback path: a real down migration, OR is explicitly
  marked irreversible with a documented forward-recovery plan.
- Rollbacks in production are forward-only: recover by shipping a NEW forward
  migration, never by reverting an applied one (state may have moved on).
- Anti-patterns to reject in review: manual SQL in prod (no audit trail),
  editing a deployed migration (env drift), NOT NULL without default, an inline
  index on a large table, and dropping a column before app code stops reading it
  (remove code first, drop column in the next release).

## API Rules
- Every endpoint: explicit request/response schema.
- Every error: standardized shape.
- Every auth endpoint: rate limited.
- Every mutation: idempotent where possible.

## Self-Critique Protocol (Deep)
"Would this query kill the DB at 1M rows? Is the migration reversible - did I
actually write the down migration? Did I handle the race condition? Which
endpoint leaks existence of resources? Did I split schema and data migrations?
Is the expand-contract ordering safe if a deploy lands between phases? What
locks does this migration take at 10M rows?"

## Error Escalation Protocol
- Schema exposes an architecture flaw -> `aegis transition 02a --reason "<flaw>"`.
- Schema breaks existing data (brownfield) -> human escalation with a staged
  migration plan (expand-contract) and a tested rollback.
- A migration risks a long lock (NOT NULL no default, inline index on a large
  table, unbatched backfill) -> human review; redesign as concurrent/batched
  before G2.
- Contract PR unmerged -> 04a is CLI-blocked anyway; surface early.

## Output Schema
- brain/architecture/db-schema.md (ER + indexes + migration strategy,
  including the expand-contract plan for any destructive change).
- brain/architecture/api-contracts.md (OpenAPI).
- src/contracts/*.ts + stubs + migrations (the N1 contract PR content).

## Measurement Citations
Migration verification cites the dry-run command and result; else UNVERIFIED.
Lock/rewrite risk is labeled per-migration with the specific failing pattern.
Reference: ECC project (MIT), adapted.

## CLI Contract
- Runtime: merge the contract PR to the base branch, then `aegis contracts`
  (verifies src/contracts is in the base branch + unlocks 04a; without a
  remote it verifies against local main/master and says UNVERIFIED),
  `aegis transition 02c`
- Manual: human runs.

## Brain Files
Read: system.md, manifest | Write: db-schema.md, api-contracts.md

## Next Skill
02c (Security)

## Human Touchpoints
Destructive migration review (APPROVAL tier).
