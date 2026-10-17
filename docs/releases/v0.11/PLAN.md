# v0.11 "Reach" — execution matrix and lane plan

Status: 03a output, 2026-10-18. Inputs: `docs/ROADMAP.md` v0.11 scope
(R1–R6, owner-accepted), `brain/architecture/{system,api-contracts,db-schema}.md`,
`brain/quality/security-audit.md` (02c refresh), `docs/releases/v0.10/`
evidence for cross-cycle lessons. Contract: `RELEASE-CONTRACT.md` (same
directory).

## 1. Lane math

Source: `aegis doctor` (2026-10-17: `ram_total_mb` 15897, 22 cores, free
4705 MB) and `config.lane_costs_mb` (`browser_e2e 1500 + dev_server 500 +
codegen 0 = 2000 MB` per lane, the N5 pricing model):

- RAM allows `floor(15897 / 2000) = 7` lanes.
- The binding constraint is the owner's `human_lane_cap = 2`.
- **Lane count: 2** (matches `aegis status` `lanes: 0/2`). Queue, never
  bypass; `aegis slice create` refuses beyond the cap.

## 2. Slices

Every slice is vertical (implementation + tests + evidence), ≤5 files and
≤500 lines. Shared files are never built in parallel lanes (in the DAG,
they serialize across waves). No slice edits `src/contracts/`.

| Wave | Lane | Slice | Deliverable | Expected files (≤5) | Depends on |
|---|---|---|---|---|---|
| — | — | **contracts PR** | `src/contracts/hosts.ts` (declaration types/statuses), `src/contracts/evidence.ts` (schema v2 shape), `commands.ts` +`host`; minimal real `aegis host list|inspect`; registry + HELP so contract-vs-runtime parity holds; brain arch doc refresh | contracts/hosts.ts, contracts/evidence.ts, contracts/commands.ts, lib/commands.ts, commands/host.ts, cli.ts | — |
| W1 | A | **R1 strict-profile** | `quality_profile: strict\|legacy` (new projects default strict, legacy stays the brownfield default until opted in), strict merge refusals (absent RED/GREEN, absent acceptance/review), stale/corrupt refuses on both, labelled exception never prints PASS, migration preserves state/settings, idempotent reruns | lib/state.ts, commands/config.ts, commands/lifecycle.ts, commands/merge.ts (+quality gating helper if separate; trimmed to cap), test/strict-profile.test.js | contracts |
| W1 | B | **R2 host-capabilities** | versioned declarations for claude-code / opencode / cursor with official-doc citations, supported/unsupported/missing-shell assertions; `host list|inspect` reads declarations | src/hosts/declarations.ts, commands/host.ts, test/host-capabilities.test.js | contracts |
| W2 | A | **R3a claude-code adapter** | thin adapter (managed block in host config/settings), clean + repeat install, foreign preservation, link refusal, model/provider/effort byte-identity, uninstall; real-host smoke attempted (claude.exe present) | src/adapters/claude-code.ts, commands/host.ts (wiring), test/adapters-claude-code.test.js | R2 merged |
| W2 | B | **R4 evidence-publisher** | evidence export schema v2 (source SHA, CI run, commands, artifact hash, limitations); create-only; refusals: missing/stale observations, overwrite, raw prompts/credentials/private paths, reported-cost-as-billing | commands/evidence.ts, test/evidence-publish.test.js | contracts |
| W3 | A | **R3b opencode adapter** | same adapter pattern; real-host smoke (opencode CLI present on this machine) | src/adapters/opencode.ts, commands/host.ts, test/adapters-opencode.test.js | R2 merged |
| W3 | B | **R6 craft + adverse** | adverse-scenario suite (hostile repo instructions, missing tools, concurrent writers, interrupted recovery, owner-work preservation); craft pin review — bump `skills/superpowers.lock.json` only after collision review + trigger fixtures + real procedure exercises, else keep pin with the review recorded | test/adverse-scenarios.test.js (+fixtures), conditional skills/superpowers.lock.json, eval trigger fixtures | — |
| W4 | A | **R3c cursor adapter** | same adapter pattern; Cursor is absent locally → capability status `fixture-only` and an explicit owner decision on advertised scope (accept fixture-only / test elsewhere / drop from advertised set) | src/adapters/cursor.ts, commands/host.ts, test/adapters-cursor.test.js | R2 merged |
| W4 | B | **R5 executor trial** | owner-selected small/free executor delivers a real feature diff through Aegis (RED/GREEN, acceptance, review, merge, recovery); task + assertions frozen before the run; interventions, tool/host versions, usage provenance recorded. **BLOCKED on the owner** (choice + spend). Not executed by the orchestrator model. | executor-produced diff + evidence bundle under docs/releases/v0.11/ | OWNER |

Adapters serialize across waves (each adds one wiring line to
`commands/host.ts`); pairwise lane checks: W1 no overlap, W2 R3a/src vs
R4/commands-evidence no overlap, W3 R3b/src vs R6/test no overlap, W4 no
overlap.

## 3. Slice ritual (proven on the postrelease-repairs slice)

1. `aegis slice create <name>` (worktree + lane; cap enforced).
2. Write the full test set, commit it on the slice branch, then
   `aegis tdd red <branch> --test-file <f> --expect-exit <n>`.
3. Implement; **do not edit test bytes after RED** (`src/commands/tdd.ts:67`
   refuses GREEN when tests changed) — commit implementation.
4. `aegis tdd green <branch>`; `aegis quality acceptance <branch> --file
   <plan or file>`; `aegis quality review <branch>`.
5. Rebase on current main if it moved; `aegis merge check <branch>
   --require-proof --require-quality`; only on PASS: fast-forward merge,
   rebuild, push, `aegis slice remove <name>` (Windows: prune stale
   worktrees via `aegis doctor` if the manual delete is needed).
6. Record observations honestly; keep failed-run logs.

## 4. Merge order and rebase rule

Topological: contracts PR → W1 (R1, R2) → W2 (R3a, R4) → W3 (R3b, R6) →
W4 (R3c, R5). Within a wave, either order is legal (no shared files). A
slice whose base moved rebases before `merge check`; the oracle is the only
merge authority. A mid-slice discovery that a contract is insufficient
stops the slice: successor contracts PR first (contracts are never edited
in a slice), or the 02b rollback path if the design itself is wrong.

## 5. Pre-build choreography (03b → 04a)

1. 03b standards: `brain/architecture/standards.md` written as enforceable
   rules mapped to actual mechanisms (`tsc` strict, `npm test`,
   `lint-skills`, `validate` suites, git hooks); no aspirational items.
2. Contracts PR merged and pushed; `aegis contracts` PASS against
   origin/HEAD.
3. **Owner**: `aegis gate DEMO --approve` (interactive, retype `DEMO`) —
   required because `docs/index.html` changed after the recorded approval.
   After this, no site edits until release time.
4. `aegis transition 04a`; build waves per section 2.

## 6. Self-critique (03a checklist)

- **Shippable alone?** Yes: R1 changes refusal semantics only when opted
  in; each adapter is independently installable; R4 is additive schema v2.
- **False dependency serializing?** No invented edges; the only shared
  files (`commands/host.ts`) are serialized deliberately across waves.
- **Real dependency missed?** Contracts PR must merge first (N1); R3x
  consume R2 declarations; R5 needs owner input; site freeze protects the
  DEMO pin.
- **Merge order topological?** Yes (section 4); rebase rule stated.
- **Budget:** R5 is the critical path and owner-blocked; R3c's advertised
  scope needs one owner decision; everything else is unblocked today.

## 7. Observations carried from the v0.10 cycle

- Environment: PATH npm 12.2.0 cannot audit `npm-shrinkwrap.json`; use the
  Node-bundled npm (v0.10 HANDOVER §4). Self-cycle needs the pinned
  Superpowers checkout at the lock's commit (all six blobs verified).
- Quality receipts are branch-scoped and must be recaptured after main
  moves; `--require-quality` merge checks need fresh receipts.
- Keep published tags immutable; every release candidate needs its own
  green exact-commit CI and a fresh human G4.
