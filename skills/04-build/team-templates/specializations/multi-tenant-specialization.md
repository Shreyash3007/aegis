# Specialization: Multi Tenant

## Domain
Tenant isolation, per-tenant config.

## Additional Constraints (applied on top of the base role)
- Tenant-scoped queries enforced at data layer
- Cross-tenant leak tests
- Per-tenant rate limits

## Pairs Commonly With
auth -> security-engineer, backend-engineer | payment -> backend-engineer, qa-engineer |
data-heavy -> database-engineer, frontend-engineer (see execution matrix for actual pairing)
