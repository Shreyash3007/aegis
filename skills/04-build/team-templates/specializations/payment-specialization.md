# Specialization: Payment

## Domain
Payment flows, idempotency, PCI scope.

## Additional Constraints (applied on top of the base role)
- Idempotency keys on every charge
- Webhook signature verification
- Never store card data; PCI-scope minimization

## Pairs Commonly With
auth -> security-engineer, backend-engineer | payment -> backend-engineer, qa-engineer |
data-heavy -> database-engineer, frontend-engineer (see execution matrix for actual pairing)
