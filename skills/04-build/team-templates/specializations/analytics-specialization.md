# Specialization: Analytics

## Domain
Event pipelines that survive bad clients, high cardinality, and privacy review:
tracking, funnels, consent, schema versioning, sinks. Measure everything;
trust nothing the browser sends you.

## When To Apply

- PRD mentions funnels, event tracking, product metrics, dashboards fed by event
  streams, or a third-party sink (Segment, PostHog, BigQuery, Snowplow)
- Slice emits events from client AND server, or backfills historical event data
- Scope includes consent management, cookie banners, or GDPR/CCPA data rights

## Additional Constraints (applied on top of the base role)

- Event schemas are versioned contracts: `name@version` (e.g. `checkout_completed@3`).
  Never mutate a live schema; additive changes bump minor, breaking changes bump
  major and both versions stay ingestible until consumers migrate.
- PII scrubbing happens before the sink, not at query time. Email, IP, free-text
  fields are hashed, truncated, or dropped in the pipeline. Raw PII never touches
  the analytics store.
- Cardinality caps on every dimension. User ID, session ID, URL, and free-text
  are never event properties unbounded; bucket or hash them. One rogue property
  (e.g. `?utm_` copied into a dimension) can bankrupt a ClickHouse column.
- Client events are untrusted input: validate against the schema at the
  collection endpoint, reject or quarantine unknown fields, rate-limit per
  token. A public `track` endpoint is a write-anything API if you skip this.
- Sampling is declared, not silent. If you sample (e.g. 10% of `page_view`),
  the rate lives in the event envelope so downstream math can correct for it.
- Consent gates emission, not just storage. No event fires before consent state
  resolves; opted-out users emit nothing, not "anonymized" events.
- Server-side events (payments, signups) and client events must reconcile:
  define which source is authoritative per event, or funnels will double-count.
- Backfills are idempotent: replaying a day of events must not double-count.
  Deduplicate on event ID at ingestion.

## Extra Steps

1. Add the event taxonomy to the slice spec before writing code: event names,
   versions, properties with types and cardinality class, authoritative source,
   and sink. If it isn't in the taxonomy, it doesn't get tracked.
2. Build the collection endpoint's schema validator and PII scrubber as a
   standalone module with property-based tests — fuzz it with oversized
   payloads, unicode, nested junk, and spoofed consent headers.
3. Write a reconciliation check: for one funnel step, compare client count vs
   server count over a test window and document the expected delta.
4. Verify the quarantine path: send a malformed event and confirm it lands in
   the dead-letter store with the reason attached, not silently dropped.

## Acceptance Checks

- Schema validator rejects an event with an unregistered property (test exists
  and fails loudly, not a log line).
- PII test: an event containing an email in any field arrives at the sink
  hashed or stripped; raw value is absent from the analytics store.
- Replay test: ingesting the same event batch twice yields identical counts
  (dedup on event ID proven).
- Cardinality guard: a dimension exceeding its cap is bucketed or rejected,
  and the rejection is observable in metrics.
- Consent test: with consent denied, zero network calls leave the client
  tracker and the server emits nothing for that user.

## Pairs Commonly With

- backend-engineer — owns the collection endpoint, schema registry, and sink
  connectors; analytics constraints live mostly server-side.
- frontend-engineer — owns the client tracker, consent gating, and batching;
  the place where "zero calls before consent" gets enforced.
- qa-engineer — runs the replay/reconciliation checks; event pipelines fail
  silently without someone counting twice.
