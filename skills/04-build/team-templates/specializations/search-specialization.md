# Specialization: Search

Purpose: make the slice's query surface fast, relevant, and injection-proof — indexing, retrieval, ranking, and the UX around misses.

## Domain
Full-text and faceted search: index design (Postgres FTS, Elasticsearch/OpenSearch, Meilisearch, Typesense), analyzer/tokenizer pipelines, ranking and relevance tuning, reindex/backfill operations, and the query API that sits in front of all of it.

## When To Apply
- PRD contains a search bar, autocomplete, filtering, faceting, or "find by" requirements on user-facing data.
- Slice reads must scale past a trivial `WHERE` clause: full-text match, fuzzy match, or ranking across multiple fields.
- Scope names an external search engine or the module graph shows a `search` module.

## Additional Constraints
- All query construction is parameterized or AST-built (engine query DSL via client builders, `to_tsquery`/`plainto_tsquery` with bound params) — never string-concatenated user input. Named attack: query injection via crafted input.
- Raw user query strings are never passed to `query_string` / `simple_query_string` / regex query types; use `match`/`multi_match` or sanitized equivalents. Named attack: query-DSL operator injection (`*`, `AND`, field probing to enumerate hidden fields).
- Index freshness lag is a documented number (e.g. "≤5s eventual, fed by outbox"), not an assumption. If the write path and read path diverge, the contract PR must state the lag bound.
- Zero-results is a designed state: empty-state copy, suggested queries, or relaxed fallback (drop fuzzy, widen filters) — never a blank page or a bare empty array.
- Pagination uses cursor/`search_after` on ranked results; `OFFSET` past ~10k results is banned on engine-backed search.
- No PII in the index beyond what the contract declares searchable; indexed fields are enumerated in the slice spec, not "whatever the serializer emits".
- Every search endpoint has a rate limit and a max `size` cap; unbounded result export through search is a data-exfiltration path.
- Ranking/tuning parameters (boosts, fuzziness, field weights) live in one config module, not scattered through handlers.

## Extra Steps
1. Before writing queries, map every searchable field to its analyzer/tokenizer (or Postgres FTS config) and record it in the slice spec — analyzer mismatch between index time and query time is the classic silent "search finds nothing" bug.
2. Write the relevance fixtures first: 10-20 (query, expected-top-hit) pairs drawn from the PRD's example searches; run them as a test so ranking regressions fail CI, not users.
3. Implement the reindex/backfill path (bulk job, plus zero-downtime index swap if engine-backed) in the same slice — an index you cannot rebuild is a migration you cannot ship.
4. Measure: log query latency and zero-result rate per query; assert the p95 budget from the standards in a perf test.

## Acceptance Checks
- Injection test exists: user input containing query operators / DSL syntax returns results-as-literal, never a 500 or an expanded result set.
- Relevance fixture suite passes (expected top hits for the PRD's example queries).
- Zero-results UI/state has a test and a design artifact, not a placeholder.
- Index freshness lag is written in the slice spec and enforced by a test or an outbox/change-stream on the write path.
- Pagination test covers page 2+ on ranked results without duplicates or skips.

## Boundaries
- Never edit `src/contracts/` to add a searchable field — if the contract does not expose it, implement an adapter over what exists and send the gap back to 03a with `--reason`.
- Never touch another slice's index, mapping, or migration; cross-slice table/index sharing is a contract-PR problem, not a worktree problem. Structural error → `aegis transition 06e`.
- Never merge without `aegis merge check` passing; ranking "looks fine" is not the oracle.

## Self-Critique
- Can a user probe fields they should not see via query operators, filter injection, or `_source` exposure?
- If the index is rebuilt tonight from zero, does the backfill job actually work and is it tested?
- Which PRD example query returns the wrong top hit under my current analyzer — did I run the fixtures or assume?
- What breaks when the freshness lag spikes: does the UI lie about data that exists but is not indexed yet?

## Pairs Commonly With
- backend-engineer — search is a query/index layer; they own the API surface, the analyzer pipeline, and the reindex job.
- database-engineer — required when search rides on Postgres FTS/trigram indexes or when the engine is fed by a change-data-capture stream off the primary schema.
- frontend-engineer — only when the slice includes the search UI: debounced autocomplete, highlighting, faceted filters, and the zero-results state are their half of the contract.
