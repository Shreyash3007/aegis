# Security audit refresh — v0.11 "Reach" cycle (02c, 2026-10-17)

Status: refresh for the planned v0.11 surfaces, written before implementation.
G2 is approved cycle-wide (2026-10-13). This document maps the new attack
surface and binds each mitigation to the slice and test that must carry it.
Prior evidence: the v0.10 audits and the 2026-10-17 post-release audit
(`docs/releases/v0.10/AUDIT.json`) — the findings there are the calibration
class for everything below.

## 1. Assets and trust boundaries

Assets: pipeline state (`.aegis/`, leases), evidence receipts (TDD, quality,
merge), git repositories and slice worktrees, **host configuration stores
outside the repo** (Claude Code settings/hooks, OpenCode config, Cursor
rules/hooks), release artifacts and evidence sidecars on GitHub, and the
owner's work in lanes.

Boundaries: CLI process ↔ repository; CLI ↔ host config stores (first time
Aegis writes outside its own repo on purpose); repository ↔ pinned upstream
sources; local ↔ GitHub release API; lane ↔ lane; agent session ↔ upstream
craft text (untrusted input).

## 2. Surface map — threats and required mitigations

### S1. Host-config mutation (R3a/R3b/R3c adapters)

The post-release audit already worked this defect class inside the repo
(marker substring identity clobbered foreign hooks; writes through symlinked
hook files; hook install through a junctioned `.git`). Adapters take the same
class **outside** the repo, where the blast radius is the owner's whole tool
setup.

- Threats: tampering (foreign settings blocks overwritten or deleted);
  spoofing (a marker-like string adopts a block Aegis never wrote); denial
  (uninstall removes user content or wedges on an external store); info
  disclosure (credentials in settings read or echoed).
- Required mitigations (per adapter): identity anchored to an exact managed
  block with structural validation, never substring search; refuse to write
  through links (lstat before any mutation); back up the target once before
  the first change, with the backup named; ambiguity (multiple candidate
  generations, pre-existing backup) refuses instead of guessing; install and
  uninstall touch only the managed block and never delete files they do not
  own; model/provider/effort fields are asserted byte-identical before and
  after (compare, never normalize); no credentials are ever written or
  printed; a host without the needed capability selects **manual guidance** —
  never a new scheduler, daemon or fallback model.
- Tests (R3 planned files): clean install, repeat install, foreign
  settings/hook preservation, paths with spaces, denied permissions,
  uninstall (including partial-uninstall rollback notes), plus a fixture
  that fails if an adapter owns pipeline state, dispatches agents
  recursively, or adds model routing.

### S2. Evidence publisher (R4)

- Threats: artifact substitution, sidecar tampering, destination overwrite
  (immutability violation), leakage (raw prompts, credentials, private
  paths), forged billing (caller-reported cost presented as measured).
- Required mitigations: versioned schema binding source SHA, CI run,
  command results, artifact sha256 and known limitations; publication
  refuses on missing/stale observations; an existing release observation is
  never replaced (versioned/append names, fail closed); schema validation
  rejects raw prompts, credentials and private paths; caller-reported cost
  is labelled as reported, never as billed.
- Tests: negative fixtures for every refusal listed above.

### S3. Strict-profile migration (R1)

- Threats: silently weakening the merge bar during migration; partial
  migration leaving mixed policy; a labelled legacy exception printed as a
  quality PASS (misrepresentation).
- Required mitigations: explicit opt-in; migration preserves existing state
  and user settings; idempotent re-runs; failure paths leave a usable state;
  absent RED/GREEN and absent acceptance/review refuse strict merges; stale
  or corrupt evidence refuses under both profiles; an exception is labelled
  and never rendered as PASS.
- Tests: the R1 fixture acceptance listed in the roadmap.

### S4. Pinned craft source (R6)

- Threats: supply-chain substitution of pinned blobs; prompt injection via
  upstream skill text steering an agent away from Aegis authority.
- Required mitigations: pin by git blob hash (six-file allowlist,
  `skills/superpowers.lock.json`), verify before use; collision review
  before any revision bump; upstream text is guidance data — never
  orchestrator instructions; agent-facing fixtures include hostile
  repository instructions.
- Tests: positive/negative trigger fixtures, blob verification, hostile
  instruction cases.

### S5. Pipeline state, lanes and recovery (existing class — must not regress)

Prior audit findings (path ownership, state filesystem, atomic publication,
lock edges, uninstall edges) are repaired and locked by
`test/audit-*.test.js` + `test/audit-postrelease.test.js`. Every v0.11 slice
runs those regressions; R6 adds hostile scenarios: concurrent writers,
interrupted recovery, owner-work preservation, missing tools.

### S6. Subprocess and path discipline (global)

argv-only execution, no shell interpolation; Windows path safety (the
winpath class); case-insensitivity and long-path assumptions; linked `.git`
entry refusal; canonicalization before ownership checks; no secrets in
brain files, logs, checkpoints or evidence.

## 3. Out of scope — stated, not claimed

- OS sandbox / an attacker with local write access and timing control
  (the residual TOCTOU recorded in the v0.10 audits).
- Model routing, model selection, automatic effort (owner-parked).
- The supply chain of the host CLIs themselves.

## 4. Verification plan

Slice-specific tests from section 2; R6 adverse scenarios; the full release
battery per candidate (tests, audit, lint, deps, self-cycle, pilot, dogfood,
package-check); exact-commit CI on Windows and Linux; the release ritual
with monitor and human gates. Real host capability claims require a real
versioned-host event smoke — fixture-only results stay fixture-only.
