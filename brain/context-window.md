# Context Window
<!-- Maintained source; aegis sync embeds this in generated context blocks. -->

## Active release

v0.10 is released; **v0.11 "Reach" is the active release** (the owner
authorized the full fix plan and then v0.11). Aegis remains the only
orchestrator; model routing and automatic effort/model selection are deferred.

- v0.11 contract: `docs/releases/v0.11/RELEASE-CONTRACT.md`; execution
  matrix `docs/releases/v0.11/PLAN.md`; revised forward plan
  `docs/ROADMAP.md` (v0.11 `[ACTIVE]`).
- v0.10 release records: contract `docs/releases/v0.10/RELEASE-CONTRACT.md`;
  discovery/craft `docs/releases/v0.10/DISCOVERY-AND-CRAFT.md`; distribution
  (built `.tgz`, consumer shrinkwrap, bundled runtime) verified by
  `node scripts/package-check.mjs`.
- Current acceptance definitions: `GATES.md`; observations and final status
  must be backed by fresh command output and exact-source CI/release assets.

Never reuse v0.9 G4 as v0.10 approval (nor v0.10's for v0.11). The human
approves the exact final source commit; active lanes must close safely. Keep
the original audit and failed-run observations; append successors rather
than rewriting them.

## Current handover (2026-10-18)

- **v0.10.0 released** (2026-10-16): tag `v0.10.0` = source `43ab0bd`,
  green exact-commit CI, full ritual `CLEARED`, offline install verified,
  human G4 recorded; details in `docs/releases/v0.10/HANDOVER.md`.
- **v0.11 in flight**: contracts PR `a1c1933`; W1-A R1 strict-profile
  `3773ef2`; W1-B R2 host-capabilities `84ddeb5` (claude-code / opencode /
  cursor declarations - all `fixture-only` until real versioned-host smokes
  are recorded - plus the `declarationProblems` validator; acceptance/review
  evidence `docs/releases/v0.11/host-capabilities-quality.json`).
- **W2 in flight**: R3a claude-code adapter merged at `bdcce95` (managed
  block in `.claude/settings.json` - exact-block identity, lstat link
  refusal, named backup before the first change, model/provider/effort
  byte-identity, minimal-diff uninstall; `host install|uninstall|verify`
  wiring; Windows install form is shell form (`aegis status`) because the
  PATH `aegis` is a script shim Claude Code cannot exec-spawn). Real claude
  2.1.269 SessionStart smoke recorded - claude-code is `verified` in
  `src/hosts/declarations.ts`; acceptance/review + battery evidence
  `docs/releases/v0.11/claude-code-adapter-quality.json`. R4
  evidence-publisher (lane 2) is the remaining W2 slice. Smoke baselines:
  claude 2.1.269, aegis 0.10.0, opencode v2.0.29, cursor absent locally.
- v0.11 needs a fresh human G4 on the exact final source. Published tags
  never move; post-release repairs already fold into v0.11.
