# Context Window
<!-- Maintained source; aegis sync embeds this in generated context blocks. -->

## Active release

Owner requested a full implementation/roadmap audit, defect repairs, correct
v0.10 release, then a separately approved v0.11. Aegis remains the only
orchestrator; model routing and automatic effort/model selection are deferred.

- Release contract: `docs/releases/v0.10/RELEASE-CONTRACT.md`.
- Current acceptance definitions: `GATES.md`; observations and final status
  must be backed by fresh command output and exact-source CI/release assets.
- Revised forward plan: `docs/ROADMAP.md`. v0.11 is queued, not implemented.
- Discovery/craft evidence: `docs/releases/v0.10/DISCOVERY-AND-CRAFT.md`.
- Distribution: built `.tgz`, consumer shrinkwrap and bundled runtime;
  `node scripts/package-check.mjs` verifies a clean source's isolated install.

Never reuse v0.9 G4 as v0.10 approval. The human approves the exact final
source commit; active lanes must close safely. Keep the original audit and
failed-run observations; append successors rather than rewriting them.

## Current handover (2026-10-16)

- Pipeline: `08a` (ship verdict). Code freeze `7c05edb` (lock-deadline
  repair, merged and closed); docs follow-ups may advance HEAD. The release
  candidate is the HEAD with green exact-commit CI, a passed full ritual,
  and fresh human G4 — never an older SHA.
- Completed repair: `src/lib/lock.ts` acquisition bound 10s to 60s for the
  audit's 20-way contention check (`test/windows-lock-deadline.test.js`,
  `scripts/check-lock-deadline.mjs`). Ownership, exclusive creation and
  reclamation are unchanged. TDD RED/GREEN recorded; merge oracle passed.
- Fresh CI for `7c05edb` is running; the full 7-check ritual and fresh human
  G4 approval are still required before any tag. See `GATES.md` and
  `docs/releases/v0.10/RELEASE-CONTRACT.md`.
- Full handover for any other agent/session:
  `docs/releases/v0.10/HANDOVER.md`. Its section 2 describes the slice state
  before merge; everything else remains current.
