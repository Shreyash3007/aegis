# Changelog

All notable changes to Aegis. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/);
versioning follows [SemVer](https://semver.org/). Evidence for every claim
lives in `docs/DOGFOOD-v*.md` and the cited commits.

## [Unreleased] — v0.10 "Grade"

### Compatibility

- Node 18 is no longer supported. Use Node 20 or 22+; the patched glob parser
  requires this range. This is an intentional compatibility change in v0.10,
  not a patch release under the old runtime promise.

### Added

- Product discovery uses a shared brief and evidence-based product/design/
  engineering review, with additional specialist lenses only when relevant.
  Agreement must be justified; manufactured disagreements and simulated
  customer research are not validation.
- Sensitive-work tripwires refuse the fix/chore fast lane. Phase defaults
  are recorded on transitions; G4 shipping no longer self-approves merely
  because `autonomy=full`. This is not a sandbox around unrestricted shell.
- `tdd red|green|status` captures actual committed-test outcomes and hashes.
  `clean --require-proof` requires them; the oracle reruns the runner against
  the merged tree. Changed tests, stale GREEN, timeouts and startup failures
  do not qualify. Reviewing why RED failed is still required.
- Six selective Superpowers craft routes pinned to v6.4.2 commit and Git blob
  IDs. `blade resolve` verifies source bytes or names a native fallback. No
  global installer, second pipeline, new runtime dependency, or model routing.
- `quality acceptance|review|status` records executable criteria and review
  inputs. Open blocker/major findings refuse merge; new commits stale the
  receipts. `--require-quality` makes evidence mandatory, including ship entry.
- Logical-question ceilings on `wave --budget`, atomic reservations, and
  reviewed resets. These count Jev questions, not dollars or transport retries.
- Usage capture and immutable aggregate evidence exports distinguish
  executor-reported values from UNMEASURED gaps and omit raw private state.
- Explicit `sync --refresh-skills` upgrades installed procedures without
  reinitializing state; the previous snapshot is preserved locally.
- Frozen development calibration bank and a disposable self-conformance
  exercise covering a real test-first feature, review refusal, strict merge,
  strict ship entry, budget exhaustion and recovery. Synthetic approvals
  remain labelled as test fixtures, not independent product sign-off.

### Fixed

- Update the transitive `brace-expansion` dependency within its declared range
  to address resource-exhaustion advisories. A regression reproduces nested
  brace stack exhaustion on 5.0.7 and passes against the patched dependency.
- Dependency-changing merges no longer run against `main`'s stale installed
  modules. The oracle requires a slice installation with matching dependency
  manifests/lockfiles; it does not silently install packages or alter base deps.
- Jev now redacts credential-shaped text in questions, criterion descriptions,
  option descriptions and score levels before sending. Secret-like IDs or
  choice keys refuse egress rather than silently changing answer labels.
  Pattern redaction is a backstop, not a guarantee that arbitrary text is safe.
- Bash completions no longer emit an active recursive generator call as
  installation text; a real shell-source test verifies safe loading and the
  completion command itself is included in the candidate list.
- The audit's supposedly twenty-way concurrent stress loop was sequential
  (`spawnSync` in a loop). It now actually overlaps processes. Prior audit
  numbers are not twenty-way concurrency proof; separate ten-writer tests
  remain valid.
- State-visit warning now correctly says one permitted entry remains at 2/3,
  rather than claiming the immediately next entry is refused.

### Release status

Work is implemented but not yet released. Latest local full suite: 197/197;
skill corpus: 71 files. Conformance exercise: 61/61 expected outcomes with
six pinned source resolutions. Remote CI and the full release ritual still
must pass on the final release commit. No comparative study or real
small-executor effectiveness claim is made.

## [0.9.0] - 2026-10-14

Integrity release: every structural finding from the read-only v0.8.0 audit
closed, each with a regression test. Minor bump: new refusals are behavior
changes (`memory` cite strictness precedent), and this release adds several.

### Added

- `aegis monitor target add|remove|list` - the endpoint registry 07b always
  assumed; strict validation, loopback HEALTHY/BREACH tests.
- `aegis remove` - uninstaller: drops `.aegis/`, restores foreign hooks
  byte-identical, removes its `.gitignore` line, refuses stranded lanes,
  keeps `brain/`.
- `aegis help <command>` - per-command detail generated from the help block
  (cannot drift); `aegis completions <bash|zsh|pwsh>` generated from the
  dispatch table (no import cycle: cli-handled like help/version).
- `aegis exec --timeout <s>` - kills runaways, records TIMEOUT as data.
- `memory add --app` - per-record app tags, `--app` filtered lists,
  declared-app validation; scope table in MONOREPO-DESIGN.md.
- Gate evidence pointers (`--evidence`) on every approval; DEMO approval
  pins the artifact hash - swapped demos re-lock 04a entries until
  re-approval; pre-pin approvals re-taken once.
- Doctor: routed-blade liveness, stale hook-bake, cycle-guard approach
  warnings. Exit-code recovery hints in every blocker line.

### Changed

- Memory truth lives committed at `brain/memory/` (hashed, tamper-evident,
  migrates forward automatically); `.aegis/memory/` is index cache only;
  crash-safe tail-scan IDs.
- `slice create/remove` obey the state lock with conflict rollback
  (duplicate-name refusal included).
- Probes and judgments share the non-keep-alive transport (`monitor`
  included - same abort class as the Jev fix).
- Help reorganized by workflow; exit-code meanings aligned between help,
  contract, and README table (now complete: all 35+2 commands).
- SPEC carries an enforcement ledger (enforced/advisory/planned per
  section), named blackboard, revised acceptance; doubt gate is a required
  04c step; research loop routes via restored blades.

### Fixed

- Merge oracle self-sufficient git identity (CI runners ship none) -
  the cause of the red CI shipped through v0.6-0.8.
- State-lock mid-write read on Windows: permissive file sharing lets a
  contender read the lockfile while its bytes are still landing; the
  "unparseable lock, must be dead" shortcut then stole a LIVE holder's
  lock and two writers lost updates (CI: 6/8 chore events). Holder reads
  now retry to a shape-validated parse before any steal decision.
- CI matrix: ubuntu(20,22) + windows(22); audit harness runs in CI.
- 8.3 short-path test assertion; jev stub `-e` template backslash hazard.
- Stale install URLs, footer link/text mismatch, "60 edges" caption.

### Security

- Jev egress redaction (wire-proven) + documented trust model; update
  supply-chain section (manual tag verification, no-checksum honesty).

### Not done (measured, not promised)

- Memory perf: 1k-record index rebuild + full scan measured ~340ms
  startup-dominated; lazy index and summary sidecar deferred until evidence.
- Executor-model variance in the pilot (below): judging roles ran mock.

### Errata (append-only corrections to prior releases)

- 0.6.0–0.8.0 shipped while CI was red (oracle identity bug, unnoticed
  because dev machines carry a global identity). Fixed + regression-tested
  here; ritual step 6 exists so it cannot recur silently.
- "24 external blades" (0.6.0 notes): the registry holds 21; 5 were
  archived by the prune and have been restored.
- "Suite 153/153" (0.7.0/0.8.0 notes): Windows-local truth while CI was
  red. This release's numbers are cross-platform gated.

### Verified

- Suite 178/178, lint 68/68, audit 150/0, dogfood 71 steps 0 unexpected
  (x3 runs), concurrency 7/7 (x2), live trigger 43/43 (0.7.0 spike).

## [0.8.0] - 2026-10-13

Audit release: a 148-check adversarial harness (`scripts/audit.mjs`:
usage/shape matrix, state-machine edges, integrity trips, idempotency,
stress, help-surface consistency) walked every command and refusal path.
Headline finding: usage exits were split 2/4 across commands. The rule is
now mechanical - **2 = malformed call, 4 = well-formed but refused**
(reasons, protocol moments, and gates keep their codes) - remapped across
~40 sites, recorded in the 06a conductor rule and the N1 exit-code contract.

### Changed

- Malformed invocations (bare commands, bad enums, out-of-range numerics,
  unknown skills/keys/suites, unparseable request files) exit 2 everywhere:
  `transition`, `slice`, `lane`, `loops`, `config set`, `hooks --profile`,
  `eval trigger` inputs, all `jev` request shapes, `demo record`, all
  `memory add` validations.
- `CONTRACT_EXITS[2]` widened to `malformed call or missing state`.

### Verified

- Audit harness: 148 checks, 0 findings. Suite 153/153, lint 68/68.

## [0.7.0] - 2026-10-13

Self-cycle release: the complete v0.6.0 pipeline walked on this repo itself
(00a to 08b, every gate refused-then-approved), shipping conductor
visibility and cite-or-stamp enforcement through a slice worktree merged via
the oracle. Minor bump: `memory add` gains a new refusal.

### Added

- `status` and the deterministic handoff surface quarantine freezes, clean
  failing branches with cycle counts, the demo record, and the memory
  summary (conditional lines only; stock output unchanged).
- N1 self-contracts (`src/contracts/commands.ts`): the CLI command surface
  and exit-code contract, with `test/contracts-self.test.js` refusing
  runtime drift from the file.
- Missing-state errors point slice-worktree operators back at the main
  checkout via shared `noStateMsg` (seven call sites) instead of suggesting
  a forked `init`.
- `doctor` drift detector: tracked `.aegis/` files and missing `.aegis/`
  ignore coverage (regression cover for the index-poison trap).

### Changed

- `memory add --cites` enforced: local paths must resolve, `mem-` refs must
  be live, URLs exempt. Phantom citations exit 4.

### Verified

- Suite 153/153, `lint-skills --all` 68/68, dogfood re-run 71 steps
  0 unexpected, concurrency file twice 7/7, full walk 00a to 08b with live
  Jev triage consumed as review input at 06b.

## [0.6.0] - 2026-10-13

The god-skill release: Aegis becomes the single enforcement + judgment +
memory framework for AI-native work, built for small/free models first.
`docs/GODSKILL-SPEC.md` (all 15 sections) is implemented per its build order;
`CONSTRAINTS.md` is the written quality bar no agent may silently lower.

### Added

- `aegis lint-skills` - Margin Format gate (frontmatter order/validity, line
  budgets 80/120/200, body order, CLI-ref existence, vague markers, link
  resolution, trigger collisions vs `skills/routing.json`). `eval` shares the
  same checker - one rule set, no gate drift. All 68 skill files migrated.
- `CONSTRAINTS.md` - autonomy ladder (L0 human-only through L2 autonomous,
  mechanical pattern classification, default-deny), evidence law, judge
  thresholds, UI fidelity scale, simulation tiers.
- Blade routing (`skills/routing.json` + `docs/ROUTING.md`): 24 external
  skills routed as thin/thick blades; collisions banned; fallbacks declared.
  Aegis never imports blades and no blade invokes another.
- `aegis clean <branch>` - loop-until-clean gate: oracle VERIFY + CLASSIFY,
  per-branch cycle accounting, 3 cycles to exit-5 escalation with evidence
  pack, unchanged-SHA re-run to exit-5 doubt theater. PASS resets.
- `aegis quarantine freeze|clear|list` - park failing lanes with audited
  reason; oracle and clean refuse frozen lanes; `clear` retains cycles;
  `loops reset` clears them as reviewed recovery.
- `aegis memory add|list|get|verify|retire|reconcile|promote|sync` - typed
  decision/contract/finding/assumption records (status, confidence, cites,
  expiry, supersedes); contradictions auto-open reconcile tasks; stale
  surfacing; sealed lane scratch with merge-gate promotion; zero-dep SQLite
  FTS5 index; deterministic `brain/memory.md` view; resume-pack summary line.
- `aegis jev judge|triage|score|classify|cite` - judgment ring over direct
  TypeSafe HTTPS (zero new deps, live-verified against production as
  jev-1.13.0): 0.7 triage/citation gate, THEATER detection, pattern-authority
  classify, shared-evidence cite. No key = verbatim DEGRADED mode;
  `JEV_BACKEND=mock` for deterministic dry runs.
- `aegis demo record|status` + DEMO gate on every 04a entry - prototype track
  made mechanical: UI html or contracts+sequence+trace pinned, human-approved,
  lanes shut until then. `aegis sync` merges the invariant into old installs.
- `aegis eval trigger` - trigger-precision eval (built-in corpus self-test or
  `--file` cases, default threshold 0.8, below = exit 11 + rewrite list).
  Live self-test: 41/43, one rewrite, re-run 43/43.
- `doctor` drift detector: tracked `.aegis/` files and missing `.aegis/`
  coverage in `.gitignore` are reported (regression cover for the
  index-poison trap found by the v0.6.0 dogfood).
- Shared non-keep-alive HTTP transport (`src/lib/http.ts`): ends the Windows
  libuv fail-fast abort that corrupted gate exit codes after sequential
  judgments. Used by the Jev client and the eval judge alike.

### Fixed

- Windows conformance across the suite: backslash-tolerant integrity
  regexes, cross-platform exec no-op, toolchain-missing wording, `tsc.cmd`
  shim support so the merge oracle produces real TS2322 diagnostics.
- `writeJ` retries transient Windows rename-over-open lock errors (race found
  under full-suite load).
- Quarantine matching unified into one matcher (was tripled logic); freeze
  resolves the real branch ref instead of guessing `aegis/slice-<name>`.

### Verified

- Suite 147/147, `lint-skills --all` 68/68, live trigger precision 43/43.
- `docs/DOGFOOD-v0.6.md`: 71 recorded steps across three scenarios
  (greenfield pipeline, adversarial clean+quarantine, brownfield UI demo),
  0 unexpected exit codes.

## [0.5.2] - 2026-07-24

Pre god-skill baseline. Pipeline state machine, sacred gates, merge oracle,
worktrees, checkpoint/resume integrity, eval harness with opt-in model judge,
monorepo support, hooks profiles. See `docs/DOGFOOD-v0.2.md` for the trial
record of the era.
