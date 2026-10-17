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

## Current handover (2026-10-17)

- **v0.10.0 is released** (2026-10-16): tag `v0.10.0` = source `43ab0bd`,
  green exact-commit CI, full ritual `CLEARED`, offline install verified,
  human G4 recorded. Assets + evidence sidecars on the GitHub release.
- Pipeline: `07a` tech-debt cycle with open slice `postrelease-repairs`:
  the 2026-10-17 post-release audit fixes (hook identity, link traversal,
  slice identity, lock/uninstall edges) and claims/doc corrections. Fixes
  fold into the next release; published tags never move.
- v0.11 is queued in `docs/ROADMAP.md`, awaiting the owner's explicit go.
- Full handover for any other agent/session:
  `docs/releases/v0.10/HANDOVER.md` (post-release edition).
