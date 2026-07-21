# Specialization: Real Time

Apply to a slice whose core value is live state reaching clients without a
poll loop. Owns the transport protocol end to end: connection lifecycle,
event ordering, catch-up after disconnect, and graceful overload behavior.

## Domain

WebSockets / SSE transports, presence, event ordering, reconnect catch-up,
backpressure. The hard problems are not sending messages - they are
guaranteeing that a client that flaps, stalls, or reconnects converges to
the correct state with zero lost and zero duplicated events.

## When To Apply

- The PRD mentions live updates, presence, typing indicators, collaborative
  editing, live feeds, tickers, or push-style notifications to open sessions.
- A slice needs server-initiated messages rather than request-response polling.
- Ordering or freshness matters: a stale or reordered event is a user-visible
  bug, not a cosmetic glitch.

## Additional Constraints (applied on top of the base role)

- Every event carries a monotonic sequence number (per channel or per room);
  the client sends `lastSeen` on reconnect and the server replays or returns
  a resync-required marker. Silent gaps are forbidden.
- The client must deduplicate on (channel, sequence): at-least-once delivery
  after reconnect is assumed, never at-most-once.
- Presence is soft state: heartbeat with timeout, no "online" flag without
  an expiry. A killed connection must decay without a clean close frame.
- Backpressure is explicit: bounded server-side send queues per connection;
  on overflow, drop oldest and mark the client stale (forcing resync) or
  close with a protocol error. Never buffer unboundedly.
- Auth on the socket, not just on connect: token expiry must sever or
  re-challenge live connections; channel subscriptions are authorized
  individually, never inherited from "connected once".
- Connection churn (deploy, LB drain, mobile network flap) is the normal
  case, not the error case: the protocol defines client retry with
  exponential backoff and jitter.
- Wire payloads conform to a versioned event envelope in `src/contracts/`;
  envelope changes go back to 03a, never edited mid-build (N1).

## Extra Steps

1. Add to the base role's workflow: define the event envelope (type, seq,
   channel, timestamp, payload) and the reconnect/catch-up handshake as
   contract additions, proposed back to 03a before writing transport code.
2. Write a reconnect simulation test: client connects, receives events 1..N,
   drops mid-stream, reconnects with `lastSeen`, asserts 0 lost and 0
   duplicated events.
3. Write an ordering test under concurrent publishers: two producers emit
   interleaved events to one channel; assert the client never applies an
   older sequence after a newer one.
4. Write an overload test: slow consumer against a fast producer; assert the
   bounded queue policy triggers (stale marker or close), not memory growth.

## Acceptance Checks

- Reconnect simulation test exists and passes: zero lost, zero duplicate
  events across a mid-stream disconnect with `lastSeen` catch-up.
- Sequence numbers are monotonic per channel and enforced client-side; an
  out-of-order delivery path in the test suite fails without dedup logic.
- Presence test proves a hard-killed connection (no close frame) expires
  within the heartbeat timeout window.
- Backpressure test shows bounded memory under a stalled consumer, with the
  documented drop/close policy observable.
- `aegis merge check` passes with the event envelope present in
  `src/contracts/` and no contract diff outside the approved envelope.

## Pairs Commonly With

- backend-engineer: owns the socket server, pub/sub fan-out (Redis streams,
  NATS, or pg_notify as the contract specifies), and the catch-up replay
  store. Real-time protocol logic is mostly server-side; this is the anchor.
- frontend-engineer: owns the reconnecting client, exponential backoff,
  dedup buffer, and optimistic-UI reconciliation against the event stream.
  Pair when the slice renders live state rather than just emitting it.
- database-engineer: pair when catch-up requires a durable event log (an
  append-only events table or stream); replay window and retention are
  schema decisions, not socket decisions.
