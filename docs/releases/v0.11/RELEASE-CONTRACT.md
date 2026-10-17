# v0.11 release contract

## Owner request

“continue and implement the complete fix plan entirely and continue”, with the
earlier plan statement “then proceed with the releasing the v0.11”.

This authorizes the v0.11 "Reach" implementation as scoped in
`docs/ROADMAP.md` (R1–R6) and the execution matrix in
`docs/releases/v0.11/PLAN.md`. It does not authorize model routing or
automatic model/effort selection (parked), does not move the published
`v0.10.0` tag, and no v0.10 gate approval counts for v0.11 source.

## What this release delivers

1. **R1** — opt-in strict-project quality profile (`quality_profile:
   strict|legacy`): new projects default strict, existing repos keep legacy
   until opted in; strict merges refuse missing/stale/corrupt receipts; a
   labelled legacy exception never prints a quality PASS.
2. **R2** — versioned host capability declarations (Claude Code, OpenCode,
   Cursor) with documented event bindings, install fixtures, and the explicit
   rule that an unsupported event stays unsupported and a missing shell
   selects manual guidance — never a new scheduler, daemon or fallback model.
3. **R3a/b/c** — thin Claude Code, OpenCode and Cursor adapters that write
   only their managed blocks in host configuration, preserve foreign
   content, refuse linked targets, and verify model/provider/effort fields
   byte-identical before/after. Each host's capability is advertised only
   after a real versioned-host event smoke; fixture-only results remain
   fixture-only.
4. **R4** — immutable per-release evidence publisher extending the existing
   aggregate exporter: versioned schema binding source SHA, CI run, command
   results, artifact hash and known limitations; publication refuses
   missing/stale observations, overwrites, raw prompts/credentials/private
   paths, and caller-reported cost disguised as measured billing.
5. **R5** — a real owner-selected small/free-executor delivery trial: the
   executor produces the actual diff, RED/GREEN, acceptance, review,
   integrated merge and recovery evidence through Aegis. Task and assertions
   freeze before the run; interventions, failures and actual usage
   provenance are recorded. A script or mock cannot satisfy this slice; a
   missing executor/credentials is BLOCKED, never a success.
6. **R6** — pinned craft upgrade (only after collision review, source
   checks, positive/negative trigger fixtures and selected real procedure
   exercises) plus adverse-scenario regressions: hostile repository
   instructions, missing tools, concurrent writers, interrupted recovery,
   owner-work preservation.

## Must pass before publication

1. Fresh build, complete tests, deterministic skill lint, dependency audit
   (Node-bundled npm — see v0.10 HANDOVER §4 environment note), self-cycle
   with the pinned craft checkout, pilot, dogfood, package-check.
2. Slice-level evidence: every code slice carries TDD RED/GREEN receipts
   (identical test bytes at both commits), branch-scoped quality acceptance
   and review, and `aegis merge check --require-proof --require-quality`
   PASS before its fast-forward merge.
3. Real host evidence for every **advertised** adapter (R2/R3). A host or
   executor that is unavailable reduces advertised scope only with an
   explicit owner decision — recorded, never silently marked complete.
4. R5 delivery evidence (or an explicit owner decision to ship without it,
   stated in the human verdict — the roadmap default is that v0.11 exit
   requires R5).
5. Exact-final-commit CI on the supported matrix and the full release
   ritual (`CLEARED to tag`), not `--local`.
6. Fresh human G4 for the exact candidate commit; never reuse the v0.10
   approval. Active lanes safely closed; no open release-blocking finding.
7. Immutable `v0.11.0` tag, built asset + checksum + evidence sidecar
   published, live release/site references verified.

## Gate choreography

- **Contracts (N1)**: before any build lane, merge the v0.11 contracts PR
  (`src/contracts/hosts.ts`, `src/contracts/evidence.ts`, `commands.ts`
  gains `host`; minimal real `aegis host list|inspect` so contract and
  runtime help stay consistent) and pass `aegis contracts` against
  origin/main. Slice merges never edit `src/contracts/`.
- **DEMO**: the recorded artifact (`docs/index.html`) changed since the
  v0.10 approval; the owner re-approves before the first build lane
  (`aegis gate DEMO --approve`, interactive retype). Site edits after that
  point happen only at release time.
- **G2**: approved cycle-wide (2026-10-13); the v0.11 surface refresh is
  `brain/quality/security-audit.md` (02c, 2026-10-17) and binds mitigations
  to slices.
- **G3** after integration; **G4** fresh for the exact candidate commit.

## Limits that must stay visible

- Skills and declarations guide behavior; the CLI cannot prove host
  integration beyond the recorded smoke, nor taste, nor study adequacy.
- Merging the craft lens does not endorse its claims; upstream text stays
  guidance data, never orchestrator instructions.
- Apron checks are not an OS sandbox: an attacker with local write access
  and timing control is out of scope (residual recorded in the v0.10
  audits).
- Executor-reported tokens/cost are not billing; the v0.11 trial is one
  delivery trial, not a benchmark or an effectiveness study.
- Fixture-only adapter results are stated as fixture-only; a documentation
  claim is not an observed integration.

## Rollback

Keep `v0.10.0` and any older tag immutable. Prefer holding the v0.11
release or publishing a successor fix over downgrading. Before any
downgrade: preserve `brain/memory/`, inspect pending recovery journals, and
take an owner-reviewed machine-state backup. Older CLIs do not understand
all newer integrity inputs; never use downgrade to bypass a refusal.
