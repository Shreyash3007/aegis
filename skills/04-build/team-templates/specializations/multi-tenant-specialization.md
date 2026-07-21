# Specialization: Multi-Tenant

Tenant isolation: every row, query, job, and cache entry belongs to exactly one
tenant, and the data layer - not developer discipline - is what enforces it.

## Domain
Multi-tenant data isolation and per-tenant behavior: tenant context resolution,
tenant-scoped persistence (shared schema + scoping, Postgres RLS, or
schema-per-tenant), per-tenant config/limits, and safe tenant offboarding.

## When To Apply
- The PRD says "workspaces", "organizations", "teams", or "per-customer data" - any B2B SaaS shape
- Per-tenant config, branding, feature flags, or plan limits appear in scope
- A slice touches shared tables where one customer's rows must be invisible to another

## Additional Constraints
- Tenant context is resolved once per request from the authenticated identity
  (session/JWT claim), never from a client-supplied `tenant_id` in body, query,
  or path - accepting it from the client is the cross-tenant IDOR.
- All data access goes through a tenant-scoped layer: Postgres RLS
  (`tenant_id = current_setting('app.tenant_id')`), Prisma/ORM middleware, or a
  scoped repository. Raw ORM calls that bypass it are a defect, not a style issue.
- Slugs, names, and external IDs are unique per tenant, not globally:
  composite constraints like `UNIQUE(tenant_id, slug)`, matching composite indexes.
- Missing or ambiguous tenant context fails closed (request rejected), never
  falls back to a default or "first" tenant.
- Background jobs, queue payloads, and webhook handlers carry `tenant_id` and
  re-assert tenant context inside the worker - jobs are the classic leak path
  because they run outside request middleware.
- Shared caches and rate limiters key on `tenant_id`; no cross-tenant cache
  hits, and one tenant's burst cannot starve the others (noisy neighbor).
- Tenant deletion/offboarding exports then purges every row owned by that
  tenant; verify no orphaned rows in join tables or object storage.

## Extra Steps
1. Pick the isolation model before writing endpoints - shared schema + scoped
   queries vs. RLS vs. schema-per-tenant - record it in the slice spec and do
   not mix models across tables in the same slice.
2. Build the scoping enforcement (RLS policy / middleware / scoped repo) and a
   test proving an unscoped query fails BEFORE writing any endpoint.
3. Write cross-tenant leak tests first: seed tenants A and B, then assert B
   cannot read, list, update, or delete A's resources by ID.
4. Verify the contract in `src/contracts/` names tenant ownership on shared
   entities; if it does not, escalate to 03a - do not improvise a tenancy field.

## Acceptance Checks
- A test exists where tenant B requests tenant A's resource by ID and receives
  404 (not 403 - do not confirm the resource exists).
- An intentionally unscoped query against a tenant table fails in CI (lint
  rule, wrapper type error, or RLS denial).
- Collision test passes: the same slug created in two tenants both succeed.
- Job-path test passes: a worker processing tenant A's job cannot read tenant
  B's rows.
- `aegis merge check` runs green with all leak tests included in the slice branch.

## Pairs Commonly With
- backend-engineer - owns the tenant-resolution middleware and scoped data
  layer; almost all of this specialization lives in that workflow.
- database-engineer - RLS policies, composite `(tenant_id, ...)` indexes, and
  backfilling `tenant_id` onto existing tables without locking them.
- security-engineer - cross-tenant access is an IDOR; pair when the slice
  includes admin, support-impersonation, or tenant-switching flows.
