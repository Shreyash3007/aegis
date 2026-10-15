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
