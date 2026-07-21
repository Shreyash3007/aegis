# Specialization: Import Export

Bulk data in and out of the system - CSV/JSON imports, scheduled exports,
migration of user-owned data. Apply on top of a base role; never alone.

## Domain
Parsing untrusted files at scale, streaming writes, resumable jobs, and the
failure modes unique to batch: partial completion, duplicate rows, encoding
surprises, and exports that leak another tenant's data.

## When To Apply
- PRD mentions CSV/Excel/JSON import, bulk upload, data migration, or
  "bring your existing data" onboarding.
- Slice includes exports, report downloads, or a public API that streams
  large result sets.
- Scope has background jobs that process files users supply.

## Additional Constraints
- Stream, never buffer: parse with a streaming reader (e.g. `csv-parse`
  stream, SAX-style XML); a 100 MB upload must not become a 100 MB string
  in memory.
- Every import is idempotent: dedupe on a natural key or client-supplied
  dedup token; re-running the same file after a mid-job crash must not
  create duplicate rows.
- Row-level error reporting: failures are collected with line number,
  column, and reason into a downloadable error file; valid rows still
  commit. No all-or-nothing rollbacks on multi-thousand-row files.
- Zip-slip and path traversal: validate every extracted path stays inside
  the target directory; never trust filenames inside archives.
- Formula injection on export: prefix cells starting with `=`, `+`, `-`,
  `@` so a crafted name cannot execute in Excel on the export consumer's
  machine.
- Encoding: detect or require UTF-8, strip BOM, reject silently-mojibake
  input rather than storing corrupted names.
- Import jobs are async with resumable checkpoints (offset + dedup
  frontier persisted); a worker restart resumes, not restarts.
- Export endpoints enforce the same authorization as the UI - a signed
  URL or token must not widen scope beyond what the requester can see.

## Extra Steps
1. Before writing the parser, pin down the format contract: required
   columns, delimiter, encoding, date/number formats - and confirm it
   lives in `src/contracts/` so other slices (UI upload form, API) agree.
2. Add a format version header to exports and accept it on imports, so a
   v2 column change does not brick v1 files already in the wild.
3. Build the error-file generator as a first-class artifact, not a log
   scrape; the QA slice's tests read it directly.
4. Load-test with the largest realistic file in the PRD (state the row
   count in the slice spec); measure memory flatness, not just wall time.

## Acceptance Checks
- A 10k-row import with 3 bad rows commits 9,997 rows and returns an
  error file naming lines 2, 5, 841 (or the actual bad line numbers) with
  reasons - test exists and passes.
- Re-running the same import file twice yields identical row counts and
  zero duplicates - idempotency test exists.
- An export containing a cell value of `=cmd|'/c calc'!A1` (or any
  formula prefix) is sanitized in the output - test exists.
- Peak memory during a max-size import stays bounded (flat RSS curve) -
  benchmark recorded in the slice checkpoint.
- Tenant A cannot pull tenant B's rows via a guessed or replayed export
  URL - authorization test exists.

## Pairs Commonly With
- backend-engineer - owns the streaming parser, job queue, and resumable
  checkpoint logic; import/export is fundamentally server-side plumbing.
- data-engineer - needed when imports feed pipelines or warehouses, where
  schema mapping and dedup-key design get nontrivial.
- qa-engineer - batch failure modes (partial commits, encoding, zip-slip)
  are exactly what happy-path tests miss; pair when imports are
  user-facing.
