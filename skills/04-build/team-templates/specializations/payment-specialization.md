# Specialization: Payment

Money moves through this slice. Wrong code here doesn't throw a 500 - it charges a customer twice or loses a refund. Correctness is financial, not cosmetic.

## Domain
Payment flows (charges, refunds, subscriptions, payouts), provider webhooks, idempotency, money arithmetic, PCI scope.

## When To Apply
- The PRD or execution matrix mentions charges, refunds, subscriptions, payouts, invoices, or a payment provider (Stripe, Adyen, Braintree).
- A slice touches checkout, billing, ledger entries, or webhook receivers for a payment provider.
- The contract PR (src/contracts/) defines payment event types or money-bearing interfaces.

## Additional Constraints
- Idempotency keys on every mutating call: charge, refund, capture, cancel. Key = (user, operation, amount, currency) hash or a client-supplied UUID stored with the result. Retry-safe by construction.
- Webhook handlers verify the provider signature (e.g. Stripe `Stripe-Signature` HMAC with the endpoint secret) before parsing the body. Reject unsigned or stale-timestamp events with 400, never 200.
- Webhook processing is idempotent: persist processed event IDs and no-op on duplicates. Providers retry; a redelivery must not double-apply.
- Never store PAN, CVV, or full card numbers. Tokenize via the provider (PaymentMethod ID, SetupIntent). PCI scope minimization: only last4 + brand may persist.
- Money is integer minor units (cents) in an integer type, never float. Currency code travels with every amount; no implicit-currency arithmetic.
- State machine, not flags: payment records move through explicit states (pending -> authorized -> captured / failed / refunded). Illegal transitions throw.
- Reconciliation path exists: every local ledger entry maps to a provider object ID; mismatches surface in tests or monitoring, not in support tickets.
- Never trust client-supplied amounts. The server recomputes totals from cart/price IDs declared in src/contracts/; a mismatch rejects the request. Price-tampering is the most common checkout attack.
- Provider secrets come from config (`aegis config`-managed env), never committed to the slice branch or logged. Card fields never appear in request logs or error messages.

## Extra Steps
1. Before writing charge code, pin the provider SDK version in the slice spec and read its error taxonomy - map every provider error to a local state transition, with no unmapped fall-through.
2. Build the webhook receiver and its signature verification FIRST, testable in isolation with the provider's test-mode signed payloads, before the happy-path charge flow.
3. Add a double-submit test: two concurrent requests with the same idempotency key must produce exactly one charge and one ledger entry.
4. Simulate provider failure modes in tests: timeout, 500, duplicate webhook delivery, out-of-order events (refund arrives before capture).
5. Record the payment state machine in the slice spec so 04c can validate every transition during integration, and so 04b's merge oracle sees no drift from src/contracts/.

## Acceptance Checks
- A webhook signature verification test exists and fails when the signature is tampered or the timestamp is outside tolerance.
- The idempotent-retry test proves one charge per key across concurrent and sequential retries.
- The migration adds a unique index on the idempotency-key column, and a concurrent-insert test proves the database - not just app code - enforces it.
- A price-tampering test exists: a modified client total is rejected and the server-computed amount is what gets charged.
- A grep over the slice branch finds no float arithmetic on money values and no stored card data beyond last4/brand.
- Every payment state transition in the code matches the states and events declared in src/contracts/; an undeclared transition is a contract gap, not a creative choice.
- Failure-path tests exist for provider timeout and duplicate webhook delivery; both leave the ledger consistent.

## Escalation
- Contract gap (a payment state, event, or amount type missing from src/contracts/) -> STOP the lane, send back to 03a with `--reason`; never widen the contract from a build lane.
- Structural error in the payment module graph (circular dependency, slice boundary violation) -> 06e via `aegis transition 06e`.
- Repeated provider-integration failure after one retry -> checkpoint with `aegis checkpoint`, hand to a human; do not silently stub the provider.

## Pairs Commonly With
- backend-engineer - payment logic is server-side by definition; this specialization is the reason the backend agent's slice spec carries idempotency and webhook constraints.
- qa-engineer - double-spend and duplicate-webhook scenarios need adversarial test design, and 04a may duplicate QA on payment slices.
- database-engineer - ledger tables and idempotency-key uniqueness constraints belong in the migration files; race conditions live at the DB layer, not in app code.
