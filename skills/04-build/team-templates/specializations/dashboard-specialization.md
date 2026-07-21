# Specialization: Dashboard

Adds data-dense UI discipline to a paired base role: every widget has a load
story, a freshness story, and a query cost story, or it does not ship.

## Domain
Data-dense UI, charts, refresh. Apply when:
- PRD mentions dashboards, admin panels, metrics views, or at-a-glance pages
- Slice renders aggregated data from more than one source on a single screen
- Scope includes live or near-live numbers (refresh, polling, subscriptions)

## Additional Constraints (applied on top of the base role)
- Every widget implements all loading states: skeleton, empty, error, stale.
  A blank box while data loads is a defect, not a default.
- Skeletons match final widget dimensions - no layout shift when data lands
  (CLS regression on dashboards is the most common polish bug).
- Stale data is labeled, never silent: "updated 3m ago" timestamps or a
  stale badge when a refetch fails. Showing old numbers as current is lying.
- Every widget's backing query has a cost budget: N+1 forbidden, aggregation
  pushed to the DB (GROUP BY), not computed in a loop over fetched rows.
- Refresh strategy is explicit per widget: polling interval, refetch-on-focus,
  or subscription. Default polling interval >= 30s; nothing polls per-second.
- Concurrent refresh storms are impossible: in-flight requests deduplicated,
  and unmounting a widget cancels its request (AbortController or equivalent).
- Filters and date ranges are URL state, not component state, so a dashboard
  view is shareable and survives reload.
- Client-side aggregation over unbounded datasets is forbidden; pagination or
  server-side rollups only.

## Extra Steps
1. Before building widgets, inventory every data source on the screen and
   classify each: static, slow-changing (poll), or live (subscribe). Put the
   classification in the slice spec.
2. Write the query for each widget first; run EXPLAIN on any aggregation and
   confirm it stays inside the slice's query budget before wiring the UI.
3. Build the error and empty states before the happy path - dashboards hit
   both in normal operation (new accounts, partial outages), not edge cases.
4. Simulate a slow/failing endpoint (throttle or stub) and verify skeletons,
   stale badges, and independent widget failure - one dead widget must not
   blank the whole dashboard.

## Acceptance Checks
- A test or storybook story exists for skeleton, empty, and error states of
  every widget on the slice's dashboard screens.
- No layout shift: widget containers have fixed/min dimensions while loading
  (assertable via story snapshot or rendered markup check).
- Each aggregation endpoint has a test proving it does not issue per-row
  queries (query-count assertion or N+1 detector).
- A failing widget endpoint leaves other widgets rendered and marks only the
  affected widget stale - verified by a stub-failure test.
- Refresh behavior is asserted: polling timers cleaned up on unmount, no
  duplicate in-flight requests for the same widget.

## Pairs Commonly With
- frontend-engineer - dashboard slices are UI-led; this specialization supplies
  the widget-state matrix, URL-state filters, and refresh discipline the base
  role's generic component states do not cover.
- database-engineer - aggregation queries dominate dashboard cost; pairing
  ensures rollups, indexes on GROUP BY/filter columns, and the query budget
  land in the contract PR instead of being discovered at merge check.
- backend-engineer - when widgets need dedicated aggregate endpoints rather
  than reusing CRUD routes; the dedup/cancellation rules shape the endpoint
  contract (cache headers, consistent staleness semantics).
