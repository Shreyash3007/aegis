# Aegis Rollout Map — v0.10 → v0.12 (+ parked)

Authority: this file. Updated in reviewed development commits; each version's exit
bar is binding. Standing rules for all three: model-agnostic core (no
harness-specific logic; model routing deferred until separately requested);
no parallel skill, no fork; small/free models first; every item gated by
suite + audit + lint before the next starts; full self-run (dogfood +
self-walk + fix loop) before any release.

## v0.10 "Grade" — highest-quality output, efficiently [ACTIVE]

Goal: a verified CLI quality floor, not a claim of superior product output.
Deterministic checks enforce their declared predicates; craft quality,
customer validation and model effectiveness still need separate evidence.

- [x] **(0) Team-debate 01a extension.** PM + five lenses (UI/UX, Frontend,
      Backend, QA, Devil's Advocate) available in ONE 01a session. A trio
      leads; specialist lenses are risk-triggered, not mandatory ceremony.
      Never a waterfall relay. Independent challenge rules (every agreement
      names evidence and what was checked; no invented objections; consequential
      splits become assumption tests with owners). Conceptual model before
      screens; HTML is an assumption test via the demo track; every PRD line
      traces to debate Q&A in memory records. Reuses 04-build team-templates
      as voices. These are review lenses, not fabricated customers or a
      requirement to dispatch six agents for every question.
- [x] **(1) A9 ladder enforcement.** L0-pattern refusal in CLI, L2 fast-lane
      detection, per-phase defaults at transition time. The load-bearing
      brick: everything below plugs into rigidity, not prose.
      Implemented slice: sensitive fast-lane refusal, shared classification,
      phase defaults recorded on transitions, G4 cannot self-approve under
      autonomy=full. Boundary: these do not control shell access outside the CLI.
- [x] **(2) D2 RED-gate evidence.** merge/clean carry failing-test-first
      proof (test-output hash in the evidence map). Makes the TDD claim real.
      Implemented slice: CLI executes and pins RED/GREEN commands, committed
      tests, branch tips and output hashes. Receipts are enforced automatically
      once captured; --require-proof refuses branches without receipts. Legacy
      branches explicitly say TDD UNMEASURED. Human review still verifies the
      reason for RED; arbitrary shell access is outside the trust boundary.
- [x] **(3) Superpowers 6-blade routing** (tdd→04a, systematic-debugging→05c,
      brainstorming→01a, requesting-code-review→06b, using-git-worktrees→04a,
      verification-before-completion→05d). No pipeline merge; collisions
      declared in routing entries; version-pinned with trigger re-eval on
      every upstream bump.
      Six immutable source pins, native fallbacks and collision rules are
      executable via blade resolve. This verifies loaded bytes, not agent
      compliance. See SUPERPOWERS.md for the upgrade/evaluation protocol.
- [x] **(4) Acceptance-grade 05d.** Observable-outcome checks per acceptance
      criterion, wired into `validate`; below bar = rewrite (trigger pattern).
- [x] **(5) Review routing + spend ceilings.** 06b severity classes route
      mechanically; `--budget` caps judgments per wave (park with evidence);
      first-failing-gate stops the lane.
      Implemented: open blocker/major merge refusal, pinned acceptance/review
      receipts, logical-question reservations and reviewed reset. These bound
      question counts, not provider billing, and do not prove reviewer adequacy.
- [x] **(6) Measurement + frozen evals.** Model/tokens/cost fields on history
      reports (executor-reported, UNMEASURED when absent); aggregate evidence
      per release; a frozen development calibration bank under `evals/`.
      Implemented: private-safe aggregate export, explicitly caller-reported
      usage and UNMEASURED gaps. Study data and claims must retain provenance.
      The frozen v1 task bank is development calibration, not an independent
      held-out benchmark or a completed comparative study.
- Exit bar: suite green both platforms, audit extended (blade-collision
  section), dogfood with blades active, pilot re-run, ritual 7/7, tag.

### Release acceptance — final audit in progress

Implementation checkboxes are not release acceptance or effectiveness
evidence. `GATES.md` is the current acceptance checklist. The final release
must pass fresh-source build, all tests, skill lint, dependency audit,
adversarial audit, full self-cycle, exact-commit cross-platform CI and the
full seven-check ritual. The actual bundled package must pass an isolated,
script-free offline install; G4 must approve that source commit before tag.

- Local source snapshot `9f6231c`: tests 205/205, skill lint 71/71, audit
  153 checks/0 findings, scripted dogfood 71/71, self-cycle 61/61, native
  dependency audit 0 vulnerabilities. Tests added during review reproduced
  provider-bound credential disclosure, brace-parser stack exhaustion and
  stale dependencies in the merge oracle before their fixes.
- Cross-platform CI passed at `9a06dbb`; final-HEAD CI must pass separately.
- Six pinned sources are verified. Manual procedure-use evidence is separate
  from byte verification; neither establishes comparative effectiveness.
- `validate acceptance <branch> --file <plan>` now delegates to the same
  canonical acceptance checks as `quality acceptance`.
- The repaired pilot is a 43-step deterministic smoke, not a small-model trial.
  Frozen calibration tasks are not an independent held-out study.
- Final release ritual and a v0.10-specific human G4 approval remain open.
  The stored v0.9 approval must not be represented as new release approval.
- Successor candidates after those snapshots: `73870db` (Windows hook/slice
  path identity), `a9be808` (repository-root alias canonicalization),
  `aaa7d9c` (owned-component expansion without following links),
  `0cef1bc` (volatile lock-leaf and delete-pending open handling). Each
  failure is preserved as `docs/evidence/v0.10-ci-erratum-<sha>.json`; the
  current repair raises the lock acquisition bound to 60s for the audit's
  20-way contention check without weakening ownership. No snapshot above
  counts as release clearance on its own.
- v0.11/v0.12 stay queued until v0.10 clears the release bar. Model routing
  remains deferred. Do not silently relax these gaps to create a tag.

The owner's current scope is to audit/fix/release the implemented v0.10,
then approve an updated v0.11. A genuine small-executor trial and independent
held-out effectiveness study are explicitly not reclassified as completed
by the scripted pilot: they remain v0.11/v0.12 acceptance work below. This
scope clarification must be visible in the final human release verdict.

## v0.11 "Reach" — verified adapters and real executor evidence [QUEUED]

No implementation starts before v0.10 is released and the owner accepts
this revised plan. All commands/artifacts below are planned work, not
existing capability claims. Each slice gets an Aegis contract and worktree;
only its evidence-passing result can unblock dependent slices.

1. **R1: opt-in strict-project quality profile and migration.** Define the
   new-project vs legacy policy before changing defaults. Fixture acceptance:
   absent RED/GREEN, acceptance or review evidence refuses strict merge;
   stale/corrupt evidence refuses under both profiles; an explicitly labelled
   legacy exception never prints a quality PASS. Preserve existing state and
   user settings on migration, with rerun/idempotence and failure-path tests.
2. **R2: host capability contracts.** Inspect current official documentation
   for each host before picking any hook format. Artifacts: versioned host
   capability declarations and install fixtures. Assertions: supported event
   invokes the existing CLI once; unsupported event is explicitly unsupported;
   missing shell selects manual guidance, not a new scheduler or fallback
   model. A documentation claim is not an observed host integration.
3. **R3a/R3b/R3c: thin Claude Code, OpenCode and Cursor adapters.** Separate
   slices after R2. Planned adapter test files exercise clean install, repeat
   install, foreign hook/settings preservation, paths with spaces, denied
   permissions and uninstall. Compare model/provider/effort fields before
   and after: they must be unchanged. A fixture must fail if an adapter owns
   pipeline state, dispatches agents recursively or adds model routing.
   Release each host's capability only after a real versioned-host event
   smoke; fixture-only results remain fixture-only.
4. **R4: immutable per-release evidence publisher.** Extend the existing
   aggregate exporter, not the runtime. Validate a versioned schema binding
   source SHA, CI run, command results, artifact hash and known limitations.
   Negative fixtures: missing/stale observations, overwritten destinations,
   raw prompts/credentials/private paths and caller-reported cost disguised
   as measured billing all refuse publication. Re-running cannot replace an
   earlier release observation. Human study narrative stays on the site.
5. **R5: owner-selected small/free-executor delivery trial.** Owner chooses
   and authorizes the executor and any spend; the framework does not select
   or switch models. Freeze task and assertions before the run. The executor
   must produce the actual feature diff, RED/GREEN, acceptance, review,
   integrated merge and fresh-context recovery evidence through Aegis.
   Record corrective interventions, failures, tool/host versions and actual
   usage provenance. A script or mock cannot satisfy this slice. Missing
   credentials or host access is BLOCKED, not successful keyless validation.
6. **R6: pinned craft upgrade and adverse-scenario regression.** Commit an
   immutable upstream revision only after collision review, source checks,
   positive/negative trigger fixtures and selected real procedure exercises.
   Add independent holdout cases before evaluating future tuning; do not
   rename the development calibration bank into a benchmark. Include hostile
   repository instructions, missing tools, concurrent writers, interrupted
   recovery and owner-work preservation.

v0.11 exit: slice-specific assertions plus full build/tests/lint/audit,
installed package verification, exact-HEAD CI, real host capability evidence
for every advertised adapter, R5 delivery evidence and new human G4 approval.
If a host or executor is unavailable, reduce the advertised scope only with
an explicit owner decision; never silently mark the planned slice complete.

## v0.12 "Ecosystem" — study + community [QUEUED]

- Site study section: question, design (same-tasks × raw/Superpowers/
  Superpowers+Aegis, blinded grading, pre-registered cases), matrix
  (greenfield · brownfield · hostile legacy · injected instructions ·
  concurrent lanes · post-compaction resume · small vs frontier executor,
  n≥5), accuracy-vs-cost frontier, threats stated upfront, proof-of-work
  appendix (ritual logs, badges, dogfood timelines, errata, committed CSVs).
- External pilot: friendly repo, full walk, published log.
- Marketplace listings. Study content lives on the SITE; repo holds machine
  truth (`evidence.json`, CSVs, logs) only.

## Parked (explicitly not in 0.10–0.12)

- Model routing, model selection, and automatic effort adjustment.
- Polyglot AST graph (TS-only labeled; oracles stay multi-stack).
- Token metering (advisory-only by design; proxy is budget conformance).
- Chaos/mutation simulation tiers beyond `--load` replay (if 05d needs it).
- General artifact-scoped re-approval for PRD/G1/G2/G3. G4 source-commit
  freshness is part of the v0.10 audit repair, not parked with these gates.

## Open findings ledger (audit leftovers to watch, not block)

- O1: Trigger self-test variance 41–43/43 across live runs (0.8 absorbs it;
  CI uses mock; live reserved for calibration).
- O2: `aegis status --app` in single-app repos silently ignores `--app`.
- O3: Memory cites can't fetch URL content (exempt by design, not fetched).
- O4: Jev confidence calibration on short finding texts (triage quality
  tracks finding richness; 06b demands file-level evidence).
- O5: v0.9.0 tag sits on the ritual-cleared commit; one-line site fix rode
  main after it (folds into next tag by policy).
