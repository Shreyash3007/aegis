# Specialization: CMS

Editorial content lifecycle: modeling, drafting, review, publishing, and the
URL surface that content lives behind. Applied on top of a base role when the
slice ships content that non-developers create and edit.

## Domain
Content modeling, draft/review/publish state machines, revision history,
slug and redirect management, editor-surface security (stored XSS), and
role-based editorial permissions.

## When To Apply
- PRD mentions articles, pages, posts, docs, or "marketing team edits this"
- Slice includes an editor UI (rich text, WYSIWYG) or an admin content panel
- Publishing is a distinct act: drafts, review, scheduling, rollback - not
  just CRUD rows written by the app itself

## Additional Constraints (applied on top of the base role)
- State machine is law: draft -> in_review -> published -> archived. Enforce
  transitions in one server-side service function; the UI only displays the
  allowed next states. No direct status writes from handlers.
- Published content is never mutated in place. Every save appends an
  immutable revision row; the content table holds a pointer to the head
  revision. Rollback = point head at an older revision, never a rewrite.
- Slugs are unique per (locale, content type). Renaming the slug of a
  published item must atomically insert a 301 redirect from the old slug;
  dead old URLs are a defect, not an acceptable trade-off.
- Editor HTML is hostile input. Render rich text through an allowlist
  sanitizer (e.g. DOMPurify) server-side before storage and again at render;
  stored XSS from an editor account is the canonical CMS breach.
- RBAC at the API layer, not the UI: author edits own drafts, editor edits
  any draft, only publisher can publish or archive. Hiding the button is not
  authorization.
- Scheduled publishing is idempotent: the job picks up items where
  scheduled_at <= now and publishes each exactly once, safe under retries and
  overlapping workers.
- Deletes are soft with a restore window; permanent purge is a separate,
  permission-gated action that also cleans up the redirect and revision rows.

## Extra Steps
1. Before coding, model the content schema per the contract: content table,
   revisions table, redirects table. Flag any field the contract is missing
   instead of inventing it silently.
2. Implement the state machine as one module with an explicit transition
   table; every other code path calls it. Unit-test illegal transitions
   (draft -> archived, publish without review) returning errors.
3. Add slug generation with collision resolution (suffix, never overwrite)
   plus the redirect-on-rename write in the same transaction as the update.
4. Seed the author/editor/publisher roles and write one authorization test
   per (role, transition) pair before touching the editor UI.

## Acceptance Checks
- Test exists: author role attempting publish receives 403 from the API,
  regardless of what the UI showed.
- Integration test exists: renaming a published slug makes the old URL
  return 301 to the new one, and the revision history is intact.
- Security test exists: `<script>` injected through the editor is stripped
  or escaped in the rendered page (stored XSS regression).
- Concurrency test exists: two editors saving the same draft produce a
  conflict response for the loser, not a silent last-write-wins.
- Test exists: rollback restores the exact prior revision content and
  leaves the intervening revisions readable.

## Pairs Commonly With
- backend-engineer - owns the state machine, revision model, and RBAC
  enforcement; CMS logic is mostly server-side invariants.
- frontend-engineer - builds the editor surface: rich text, preview of
  drafts against the real render pipeline, revision diff view.
- database-engineer - revision tables grow unboundedly; needs retention
  policy, indexing on (content_id, version), and redirect-table lookups on
  the hot read path.
