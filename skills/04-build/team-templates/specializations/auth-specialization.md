# Specialization: Auth

Applied on top of a base role when the slice touches identity: who the caller
is, what they may do, and how proof of that expires, rotates, and revokes.
Its constraints OVERRIDE the base role's defaults wherever they are stricter.

## Domain
Sessions, tokens, OAuth 2.x, OIDC, MFA, password lifecycle, authZ guards.

## When To Apply
- The PRD names login, signup, sessions, OAuth/SSO, MFA, password reset, or
  role-based access control anywhere in scope.
- A slice endpoint reads a user identity (session cookie, bearer token, API
  key) before doing work — authN or authZ is on the hot path.
- The execution matrix marks the slice as touching an identity-owned table
  (users, sessions, tokens) that 03a coordinated into the contract PR.

## Additional Constraints
- Session cookies are `HttpOnly; Secure; SameSite=Lax` (or `Strict`); no token
  material ever in `localStorage` — XSS becomes full account theft.
- Refresh token rotation with reuse detection (RFC 6819): a presented-but-
  already-rotated refresh token invalidates the whole token family.
- Password hashing with Argon2id (or bcrypt cost >= 12); never SHA-anything,
  never a fast hash, never a homebrew scheme.
- Login, reset, and MFA-verify endpoints answer in constant time and constant
  shape — no "user not found" vs "wrong password" split (user enumeration).
- Per-IP and per-account rate limits on every credential-accepting endpoint;
  exponential backoff plus lockout after repeated failures (brute force,
  credential stuffing — OWASP A07).
- OAuth/OIDC: state and nonce are generated server-side, single-use, and
  verified on callback; PKCE (S256) mandatory for public clients.
- JWTs: verify signature, `exp`, `iss`, and `aud` on every request; pin the
  algorithm — never trust the token's own `alg` header (alg-confusion attack).
- Access tokens are short-lived (minutes); revocation must be checkable —
  either a denylist for long-lived artifacts or short TTLs with rotation.

## Extra Steps
1. Before writing code, list every endpoint in the slice spec and mark each
   public / authenticated / role-gated. Any endpoint with no mark is a bug —
   resolve it against the contract before proceeding.
2. Add the auth middleware/guard at the router boundary, not inside handlers —
   one un-guarded handler is one breach.
3. Write the negative tests first: expired token, rotated-then-reused refresh
   token, tampered JWT signature, cross-user ID substitution (IDOR).
4. Confirm secrets come from the environment or the platform secret store;
   grep the slice diff for token-like literals before handoff.

## Acceptance Checks
- A test proves a reused refresh token kills the entire token family.
- A test proves two login failure modes (unknown user, wrong password) return
  identical status and body shape.
- Cookie attributes asserted in an integration test: `HttpOnly`, `Secure`,
  `SameSite` present on the set-cookie header.
- Rate-limit test exists on at least one credential endpoint (429 after N
  attempts).
- `aegis merge check` passes with no contract diff against the identity
  tables — schema changes to users/sessions were not improvised mid-slice.

## Pairs Commonly With
- security-engineer — auth is where IDOR and token attacks live; security's
  "can a user become another user" checklist reviews every guard decision.
- backend-engineer — sessions, token lifecycle, and middleware are server
  work; backend owns the endpoints this specialization wraps in guards.
- frontend-engineer — login/reset/MFA flows and cookie-vs-storage token
  handling are client decisions that silently break these constraints if
  built without them.
