---
name: 02b-database
version: 0.6.0
triggers: [schema design, migration safety, contract-first code]
not-triggers: [hand-altered databases, edited deployed migrations]
inputs: [frozen system.md, manifest, G1 approval]
outputs: [db-schema.md, api-contracts.md, src/contracts N1 PR]
chains-to: 02c-security
autonomy: L1
tokens-budget: 1200
---
# SKILL-02b: DATABASE & BACKEND DESIGN

## Overview
Design schema, migrations, API contracts, auth, middleware, rate limiting — as mergeable CODE.
A bad schema is a tattoo you regret in six months.

## When
- After 02a, G1 approved and recorded; system.md frozen.
- L1+ for migration dry-runs; document-only at L0 (labeled UNVERIFIED).

## When-NOT
- Never alter a database by hand; never edit a deployed migration; never mix schema and data migrations.
- Never add NOT NULL without default; never inline-index a large table; never drop a column the app still reads.

## Process
- ER diagram from system entities, every relationship explicit with FK: `aegis status`
- Schema with indexes, each justified by its query; N+1 prevention; pagination >50; soft deletes preferred: `aegis status`
- Migration strategy (timestamp-prefix; slices rebase-and-renumber at merge; every migration reversible up AND down): `aegis status`
- Safety review: concurrent index builds, nullable/default columns, schema/data split, dry-run on prod-sized data: `aegis validate`
- Destructive changes via expand-contract (EXPAND write-both -> MIGRATE backfill batched -> CONTRACT drop-later, separate migration): `aegis validate`
- API as OpenAPI (explicit request/response; standard errors; rate-limited auth; idempotent mutations): `aegis status`
- authN/authZ model, middleware chain, rate limiting, input validation: `aegis status`
- CONTRACTS AS CODE in `src/contracts/` (interfaces + stubs + OpenAPI + first migrations) as the N1 PR: `aegis contracts`
- Self-critique, present, advance: `aegis transition 02c`

## Verification
- Migration verification cites dry-run command + result, else UNVERIFIED; lock/rewrite risk labeled per migration.
- Self-check: query at 1M rows? down migration written? race handled? existence leak? schema/data split? expand-contract safe mid-deploy? locks at 10M rows?
- Tables carry PK + created_at + updated_at; large backfills batched; rollbacks forward-only in production.

## Red Flags
- Schema exposes architecture flaw -> `aegis transition 02a --reason "<flaw>"`.
- Breaks existing data (brownfield) -> human escalation with staged plan + tested rollback.
- Long-lock risk -> human review; redesign concurrent/batched before G2.
- Contract PR unmerged -> 04a stays CLI-blocked; surface early.

## Interactions
- CLI: merge contract PR, `aegis contracts` (unlocks 04a; no remote = local verify + UNVERIFIED), `aegis transition 02c`.
- Brain: read system.md + manifest; write db-schema.md, api-contracts.md.
- Next: `02c-security`. Touchpoint: destructive-migration review.
