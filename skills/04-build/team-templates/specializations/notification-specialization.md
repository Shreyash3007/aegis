# Specialization: Notification

Cross-channel delivery (email / push / SMS / in-app) that respects user consent, never loses a message, and never wakes a user at 3 AM. Layered on top of a base role; it does not replace the base workflow.

## Domain
Email / push / SMS / in-app delivery: preference and consent management, queue-based sending with provider integrations (SES, Twilio, FCM/APNs, SendGrid), retries and dead-lettering, deliverability telemetry.

## When To Apply
- PRD mentions transactional email, push, SMS, reminders, digests, or an in-app notification center.
- Any flow where a user action must reach a human asynchronously (order confirmed, password reset, mentions).
- Slice owns a `notifications` table, a queue consumer, or a provider integration (SES, Twilio, FCM/APNs, SendGrid).

## Additional Constraints (applied on top of the base role)
- **Consent is a hard gate, not a flag.** Check channel + topic preferences and quiet hours before enqueueing, not before sending — an enqueued message that violates preferences is a bug that survives retries. Unsubscribe links per CAN-SPAM / GDPR; one-click unsubscribe (RFC 8058) on marketing mail.
- **At-least-once delivery, exactly-once effect.** Providers retry; so do we. Every send carries a dedupe key (`notification_id` + channel) so a retried enqueue or a redelivered webhook cannot double-notify.
- **Retry with exponential backoff and a dead-letter queue.** Classify failures first: provider 4xx (bad address, invalid token) -> fail permanently, no retry; 5xx / timeouts -> retry; hard bounce -> suppress the address permanently.
- **Quiet hours and rate limits live in config, not code.** Per-user quiet window, per-topic caps (e.g. max 1 digest/day), provider-side rate limits respected via the queue consumer's concurrency, never `setTimeout` sprawl.
- **Secrets stay out of payloads.** Never embed one-time codes or full PII in push bodies that render on a lock screen; the notification carries a pointer, the app fetches the sensitive content after auth.
- **Templates are versioned data, not string concatenation.** Locale- and channel-aware templates with required-variable contracts; a missing variable fails at render time, not as `undefined` in a user's inbox.
- **Deliverability telemetry is part of the slice.** Emit delivery/bounce/open (where lawful) events; a notification system with no delivery signal is indistinguishable from a broken one.

## Extra Steps
1. Extend the contract review: confirm the contract PR defines the notification payload shape and preference schema. If it doesn't, stop and escalate — do not invent the payload ad hoc.
2. Add a provider abstraction seam in the slice: channel adapters behind one interface, with a fake provider for tests so no test ever hits SES/Twilio/FCM.
3. Build the retry/DLQ path before the happy path: enqueue -> backoff -> dead-letter -> replay CLI or admin action.
4. Wire preference checks into the enqueue entry point and cover them with tests that simulate opted-out users across every channel.

## Acceptance Checks
- Opted-out user test exists: enqueue attempt produces zero provider calls on every channel and topic.
- Duplicate delivery test exists: same dedupe key sent twice results in exactly one provider call.
- Retry test exists: provider 5xx -> backoff retries; provider 4xx -> permanent failure to DLQ, no retry.
- Quiet-hours test exists: a message enqueued inside the user's quiet window is deferred, not sent or dropped.
- `aegis merge check` passes with the fake-provider suite green; no test requires network access to a real provider.

## Pairs Commonly With
- **backend-engineer** — owns the queue consumer, preference schema, and provider adapters; notification delivery is server-side work first.
- **qa-engineer** — dedupe, retry, and opt-out behavior are the highest-risk logic in the slice and need adversarial test design, not happy-path checks.
- **security-engineer** — apply when notifications carry account-recovery or financial content; token-in-payload leakage and unsubscribe-link tampering need review.
