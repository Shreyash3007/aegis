# Specialization: Reporting

Purpose: exports and scheduled reports that are byte-exact reproducible, timezone-correct, and never capable of OOMing the API process on a large dataset.

## Domain
Exports (CSV/PDF/XLSX), scheduled and emailed reports, aggregate rollups over large tables, audit-grade regeneration.

## When To Apply
- PRD contains exports (CSV/PDF/XLSX), scheduled or emailed reports, or admin-facing report builders
- Any query that aggregates unbounded row counts (sales summaries, audit trails, usage rollups)
- Reports that auditors or customers will regenerate later and expect to match the original

## Additional Constraints
- Stream every large export (cursor/keyset pagination or DB cursor, e.g. `pg-query-stream`, never `OFFSET` past ~10k rows); a report must not load its full result set into memory. Peak RSS during export stays flat.
- Store report inputs (filter params, timezone, schema version, source snapshot id) at generation time; rerunning with the same stored inputs must produce a byte-identical artifact. No `NOW()` read at render time — the generation timestamp is an input.
- All dates are stored and computed in UTC; the report's declared timezone (IANA name, e.g. `America/New_York`) is applied only at render. DST boundary ranges (start/end params) are resolved with a tz-aware library (`luxon`, `@date-fns/tz`), never string math on offsets.
- CSV injection: cells starting with `=`, `+`, `-`, `@` are prefixed with `'` before write. This is a spreadsheet-formula RCE vector, not cosmetic.
- Scheduled jobs run through an idempotent scheduler entry — keyed by `(report_id, scheduled_for)` — so a worker retry or deploy mid-run never double-sends or double-writes a report.
- Report artifacts go to object storage with a signed, expiring URL; never served as a permanent public link, never rendered inline through an auth-less route.
- Query cost is bounded: every report query carries a statement timeout and a row cap; an over-cap report fails loudly with a "narrow your filters" error, never a silent truncation.
- Access control is evaluated on the row set, not the route: a report honoring a user's filters must not leak rows from tenants or scopes the requester cannot see.
- PDF/XLSX rendering is deterministic: pin the render template version and embedded fonts in the manifest, or "byte-identical regeneration" is a lie the first time someone edits the template.
- A failed generation is a first-class state (`pending | running | failed | done` with the error recorded), never a missing row the scheduler silently skips.
- Emailed reports send the signed link, not the attachment, once the artifact passes the provider's size limit; the link expiry is the access window.

## Extra Steps
1. Define the report's reproducibility contract in the slice spec: inputs, schema version, and where the snapshot/manifest is persisted.
2. Add a synthetic large-dataset seed (>= 100k rows in the heaviest source table) to the slice's test fixtures before writing the export code.
3. Wire the scheduler entry with its idempotency key and a dead-letter path for failed generations.
4. Record the artifact-retention and signed-URL expiry policy in the slice spec so 04b's integration pass can verify it.
5. If the report contract cannot express a required filter or aggregation, treat it as a contract gap: escalate back to 03a via `aegis transition 03a --reason`, never patch `src/contracts/` from the slice.

## Acceptance Checks
- Regeneration test exists: same stored inputs run twice produce byte-identical output (hash compared).
- Export test against the 100k-row fixture completes with bounded memory (streaming asserted, e.g. peak RSS delta under the slice spec's budget).
- Timezone test exists: a range crossing a DST transition renders identical instants for viewers in two different IANA zones.
- CSV injection test exists: a payload cell like `=cmd|'/c calc'!A1` is emitted prefixed and inert.
- Scheduler retry test exists: forcing a worker crash mid-generation and retrying produces exactly one artifact and one notification.
- Manifest test exists: every generated report persists its manifest (params, IANA timezone, schema version) and regeneration reads the manifest, not the request.

## Pairs Commonly With
- backend-engineer — export endpoints, streaming query layer, and the scheduler entry live in the API slice.
- database-engineer — report queries need covering indexes, materialized views or rollups, and statement-timeout policy on the store side.
- frontend-engineer — filter builders and download UI must pass tz-aware ranges and surface over-cap errors without lying about truncation.
