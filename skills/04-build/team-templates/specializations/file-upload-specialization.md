# Specialization: File Upload

Untrusted bytes cross the boundary here. Treat every upload as hostile until
type, size, and content are all proven otherwise — then store it somewhere it
can never execute.

## Domain
Untrusted file ingest: validation, quarantine, scanning, storage, and
authorized delivery of user-supplied files.

## When To Apply
- PRD mentions attachments, avatars, imports, media, or any user-supplied file
- Slice spec includes a storage integration (S3/GCS/blob) or an `Upload` model in the contract
- Compliance scope requires malware scanning or retention rules on stored files

## Additional Constraints (applied on top of the base role)
- Validate MIME by sniffing magic bytes (e.g. `file-type`), never by client-supplied `Content-Type` or extension — that is how polyglot files slip through.
- Enforce size limits in two places: proxy/server body limit (reject fast with 413) and application check (reject with a domain error). One without the other is a DoS hole.
- Generate storage keys server-side (`uuid` + sanitized extension). Never let the client pick the path — path traversal and key-overwrite attacks live there.
- Scan before serve: quarantine on arrival, scan (ClamAV or provider API), move to clean bucket only after a pass. Files pending scan are never downloadable.
- Serve downloads through signed, short-TTL URLs (S3 presign ≤ 15 min) or a proxy that re-checks authz. A public bucket is a data leak waiting for a crawler.
- Strip metadata on ingest (EXIF GPS in photos is a privacy leak); re-encode user images rather than passing originals through.
- Never write uploads under a webroot or any path the runtime can execute. `php.jpg` uploaded to an executable directory is the classic kill chain.
- Resumable/chunked uploads (tus or multipart) must verify the assembled file's checksum and total size, not just per-chunk limits.
- Sanitize the download filename before putting it in `Content-Disposition`; a raw user filename there is a header-injection vector.
- Fail closed on scanner outage: if the scan provider is down or times out, files stay `pending` and unservable. Never treat "scan unavailable" as "scan passed".

## Extra Steps
0. If the contract endpoint for upload/download is missing or lacks fields the constraints require (status, checksum, owner), stop — the contract is frozen after N1, so hand the gap back with `aegis transition 03a --reason "upload contract gap"` instead of improvising an adapter.
1. Add the `Upload` record (status: `pending | scanning | clean | rejected`, storage key, checksum, owner) to the slice's schema inside the existing migration file for the slice — if the contract lacks it, stop and escalate (contract gap).
2. Implement the ingest path behind the contract endpoint: presign/issue → receive → validate → quarantine → scan webhook moves to clean. No direct-to-bucket browser writes without a server-issued signature.
3. Write adversarial tests alongside happy-path ones: EICAR test file, extension/MIME mismatch (`shell.php` as `photo.jpg`), oversize body, polyglot GIFAR, zip bomb if archives are in scope.
4. Configure lifecycle rules (auto-delete `pending` uploads older than 24h) and prove it in the slice with a test or infra assertion.

## Acceptance Checks
- Test exists: a file with a forged extension/MIME mismatch is rejected with 415 and never reaches storage.
- Test exists: EICAR test string is quarantined and marked `rejected`; clean file is served only after scan pass.
- Test exists: download of another user's file returns 403 even with a valid session and a leaked storage key.
- Test exists: oversized body is rejected at the proxy limit (413) without hitting application memory.
- Storage keys in tests are server-generated UUIDs; no test path derives a key from the original filename.
- Test exists: an expired presigned URL (TTL passed) is rejected by storage, and a `pending`/`rejected` file cannot be fetched even with a valid signature.
- Download responses carry `Content-Disposition: attachment` and `X-Content-Type-Options: nosniff`; user HTML/SVG never renders inline in the app's origin (stored-XSS via upload).

## Pairs Commonly With
- security-engineer — owns the scan/quarantine policy and the authz-on-download threat model; uploads are the highest-attack-surface endpoint in most apps.
- backend-engineer — implements the presign/ingest pipeline and resumable protocol; the stream handling (backpressure, partial failure cleanup) is backend craft, not boilerplate.
- devops-engineer — needed when the slice provisions the bucket itself: CORS scoped to the presign origin, lifecycle rules, and bucket policies that deny public ACLs.
