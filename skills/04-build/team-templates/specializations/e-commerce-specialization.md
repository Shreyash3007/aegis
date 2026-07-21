# Specialization: E-Commerce

Catalog, cart, checkout, inventory, orders. The domain where a race condition is
not a bug report - it is two customers who both bought your last unit.

## Domain
Cart and order invariants: what is in the cart, at what price, against how much
real stock, and what survives a retry. This specialization owns those invariants
only. The actual charge - gateway idempotency, webhook signature verification,
PCI scope - belongs to the payment specialization and its contract; do not
reimplement it here.

## When To Apply
- PRD mentions catalog browsing, cart, checkout, order placement, or inventory.
- Scope includes promotions, coupons, or price rules that mutate totals.
- Any slice where "add to cart" and "pay" are separated by time - that gap is
  where every e-commerce invariant dies.

## Additional Constraints (applied on top of the base role)
- Money is integer minor units plus an ISO 4217 currency code, end to end. No
  floats, ever - one `0.1 + 0.2` in a totals path and refunds stop reconciling.
  Rounding rule is per-currency and applied at line-item level, not at total.
- Inventory decrement is atomic and conditional:
  `UPDATE ... SET stock = stock - n WHERE stock >= n` (or a row lock inside a
  transaction). Read-then-write is an oversell machine and is forbidden.
- Oversell policy is explicit in the slice spec: hard reject or backorder. If
  neither is written, stop - do not silently allow negative stock.
- Checkout revalidates price and stock at submit time and returns a repriced
  diff to the user. Never charge a total computed at add-to-cart time.
- Order placement is idempotent: client-generated key, unique index on
  (key, user), retries and double-clicks return the same order.
- The cart is server-truth. The client sends product_id + qty; the server
  recomputes totals and applies coupons. Any client-supplied price, discount,
  or total is ignored - that is the coupon-tampering attack.
- Stock reserved during checkout carries a TTL. Abandoned holds release back to
  available inventory via an expiry sweep, not a user's good behavior.

## Extra Steps (on top of the paired base role's workflow)
1. Write the concurrency test first: N parallel checkouts against the last unit
   of stock - exactly one order survives, stock never goes negative. If the test
   is flaky instead of deterministic, the decrement is not atomic; fix that
   before anything else.
2. Verify the contract before building: cart, order, and order-line DTOs must
   exist in `src/contracts/`. Missing shape -> stop, report the gap back to 03a
   with `aegis transition 03a --reason`. Never invent a DTO mid-slice.
3. Add the abandonment sweep: expiry job plus a test proving held stock returns
   to available after TTL. Unreleased holds are inventory you think you have
   and cannot sell.
4. Keep migrations honest: `CHECK (stock >= 0)` (or the documented backorder
   equivalent) belongs in the migration files alongside the table, not as an
   application-level hope.

## Acceptance Checks (before `aegis merge check`)
- Test exists: concurrent checkout of the final unit -> exactly one success,
  no negative stock, enforced by the database not by timing luck.
- Test exists: price changes between add-to-cart and checkout -> checkout
  returns the repriced diff; the stale total is never charged.
- Test exists: same idempotency key posted twice -> same order returned, no
  duplicate row, no double decrement.
- Migration applies the stock constraint; a direct SQL write bypassing the app
  still cannot produce negative stock (hard-reject policy).
- No float arithmetic in any money path - totals test asserts integer minor
  units on order lines and on the order total.

## Pairs Commonly With
- backend-engineer -> owns the order state machine, the atomic inventory
  transaction, and the idempotent placement endpoint; this specialization is
  his rulebook for all three.
- database-engineer -> stock constraints, isolation level on the checkout
  transaction, and the reservation-TTL schema live in her migrations; without
  them the concurrency test is theater.
- qa-engineer -> the race and retry checks above are his concurrency harness;
  e-commerce slices need deterministic parallelism tests, not happy-path E2E.
