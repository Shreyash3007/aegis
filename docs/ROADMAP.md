# Aegis Rollout Map — v0.10 → v0.12 (+ parked)

Authority: this file. Updated only by release commits; each version's exit
bar is binding. Standing rules for all three: model-agnostic core (no
harness-specific logic; model routing deferred until separately requested);
no parallel skill, no fork; small/free models first; every item gated by
suite + audit + lint before the next starts; full self-run (dogfood +
self-walk + fix loop) before any release.

## v0.10 "Grade" — highest-quality output, efficiently [ACTIVE]

Goal: correctness first, cost second. Every item makes output quality
mechanical or it doesn't ship.

- [x] **(0) Team-debate 01a extension.** PM + five lenses (UI/UX, Frontend,
      Backend, QA, Devil's Advocate) grill together in ONE 01a session —
      never a waterfall relay. Independent challenge rules (every agreement
      names evidence and what was checked; no invented objections; consequential
      splits become assumption tests with owners). Conceptual model before
      screens; HTML is an assumption test via the demo track; every PRD line
      traces to debate Q&A in memory records. Reuses 04-build team-templates
      as voices. Skill-format work, zero CLI risk.
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
      events (executor-reported, UNMEASURED when absent); `evidence.json` per
      release; `evals/` task bank frozen BEFORE tuning.
      Implemented: private-safe aggregate export, explicitly caller-reported
      usage and UNMEASURED gaps. Study data and claims must retain provenance.
      The frozen v1 task bank is development calibration, not an independent
      held-out benchmark or a completed comparative study.
- Exit bar: suite green both platforms, audit extended (blade-collision
  section), dogfood with blades active, pilot re-run, ritual 7/7, tag.

## v0.11 "Reach" — packaging + external proof [QUEUED]

- Claude Code plugin (skills + hooks + review procedures), OpenCode + Cursor
  adapters. All use the user's chosen model. Core stays harness-free;
  adapters only. No harness-specific logic in CLI (02a DAG rule guards).
- `evidence.json` publisher (machine-readable per-release evidence).
- Superpowers pin process as standing routine (bump → re-eval → record).
- Small-executor pilot run and published (executor-model variance addressed).
- Capability declarations per harness: supported hooks, captured evidence,
  unsupported guarantees, and safe fallback behavior. No model switching.

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
- Per-cycle gate re-approval as mechanical rule (human process owns it).

## Open findings ledger (audit leftovers to watch, not block)

- O1: Trigger self-test variance 41–43/43 across live runs (0.8 absorbs it;
  CI uses mock; live reserved for calibration).
- O2: `aegis status --app` in single-app repos silently ignores `--app`.
- O3: Memory cites can't fetch URL content (exempt by design, not fetched).
- O4: Jev confidence calibration on short finding texts (triage quality
  tracks finding richness; 06b demands file-level evidence).
- O5: v0.9.0 tag sits on the ritual-cleared commit; one-line site fix rode
  main after it (folds into next tag by policy).
