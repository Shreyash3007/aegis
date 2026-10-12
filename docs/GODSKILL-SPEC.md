# Aegis → God Skill — Full Specification (v1.0-draft)

Status: SPEC, unapproved. Source of truth for agents after approval is derived
contracts; this file is the human approval surface alongside
`output/god-skill/god-skill-map.html` (workspace).

## 1. Goal

Evolve aegis (installed 0.5.2, `D:\Projects\aegis`) into the single hybrid
autonomous framework: machine-enforced phases, autonomy-calibrated execution,
parallel lanes, loop-until-clean review, typed record memory, cheap machine
judges. Optimized for small/free models first; frontier models must add
nothing required.

## 2. Non-goals (locked)

- No LangGraph/LangChain/CrewAI runtime dependencies. CLI owns all state;
  frameworks would duplicate enforcement (two sources of truth) and break
  small-model budgets. Role vocabulary may be borrowed; code may not.
- RAG only as memory retrieval (SQLite FTS + typed filters first).
  Embeddings only if FTS demonstrably fails, measured, not assumed.
- No second orchestrator. Conductor + lanes + merge oracle is the whole
  runtime. No agent talks to another agent; all coordination via CLI state.
- No frontier-model dependency. Anything requiring a frontier model fails
  the eval gate (runs on free/small models).

## 3. Governing principles

1. Prompts are ignorable; the CLI is not. Authority lives in code.
2. Smallest capable runner: Jev micro-judge → small model → frontier →
   human. Each rung fires only if the cheaper is inconclusive.
3. Autonomy is earned by pattern match, never assumed. Unclassifiable
   floors at L1 (default-deny).
4. No evidence, no pass. Claims cite file:line/tool output or are stamped
   INFERRED/UNMEASURED/BLOCKED.
5. Bounded everything except human taste. Every machine loop carries a
   stop condition; only the demo-iterate loop is unbounded.
6. Zero recall burden. Order/permission/state in CLI output; prompts carry
   full context; max one reference hop.
7. Slop is measured: budgets, duplication checks, line ratchet at merge.

## 4. Architecture (unchanged skeleton, upgraded organs)

- Enforcement core: aegis CLI (state, gates, transitions, checkpoints,
  lanes, merge oracle, AST guard). Exit 4 illegal jump, 5 loop escalation,
  6 tamper refusal. No new authority invented.
- Judgment ring: existing 215 installed skills re-homed as phase blades
  (§8 routing); thin chains (mattpocock shape) for flow, thick gates
  (addyosmani shape) for rigor.
- Autonomy ladder L0/L1/L2 + fast lane with mechanical pattern rules.
- Parallel lanes: cap enforced, one worktree + one checklist each,
  contracts-first, merge oracle landing.
- Judges: Jev Choice/Noul/Score behind credential flag; thresholds in
  CONSTRAINTS.md, calibrated on repo data.
- Memory: typed records (decision/contract/finding/assumption) in JSONL +
  SQLite index; decay, contradiction protocol, scratch-vs-committed
  separation, generated handoffs. Markdown brain/ becomes a rendered view.
## 5. Autonomy ladder (mechanical)

- L0 human-only (patterns: prod/auth/payments/external-send/credentials/
  ship/migration): sacred gates, TTY retype-to-confirm. No flag skips.
- L1 supervised (non-trivial: crosses module boundary, unverifiable by
  compiler, irreversible blast radius): agent acts; doubt cycle + fresh
  review required; human approves gate.
- L2 autonomous (mechanical, reversible, in-budget): runs silent;
  checklist + suite verify; batched log for async human review.
- Fast lane (fix/chore side track): skips funnel, suite must still pass.
- Classification: pattern rules in CLI first; Jev Choice+confidence second
  opinion, logged. Low confidence or no match floors at L1. Lanes graduate
  L1→L2 on measured clean runs only.

## 6. Gates and loops

- Doubt gate (between phases, mandatory 04→05): CLAIM → EXTRACT →
  DOUBT (fresh-context, adversarial, ARTIFACT+CONTRACT only) → RECONCILE
  (contract-misread/actionable/trade-off/noise) → STOP (trivial findings,
  3 cycles, user override). Cross-model offered every interactive cycle.
- Loop-until-clean review gate (per lane/merge): VERIFY (evidence-attached)
  → CLASSIFY → FIX → RE-VERIFY → PASS or cycle++; 3 cycles → escalate.
  All-noise cycles = doubt theater → escalate. No silent passes.
- Research loop (discover + quality): SEARCH (agent-reach/research/
  last30days-style + docs) → LEARN (cited candidates) → MEASURE (Jev
  confidence + simulation artifacts) → GATE (thresholds; below bar = more
  research or human call).
- Demo loop (human-led, unbounded): understand → HTML demo (exact working
  style, visual direction locked) → iterate/comment → APPROVE → contracts
  merged → production lanes. No lane opens pre-approval.
- Escalation loop: exit-5 events (loops, ping-pong) go human with evidence
  pack; siblings continue on last-known-good.

## 7. Confidence and Jev wiring

- Per-finding Noul triage (parallel batches); per-cycle actionability
  Score (theater detector); autonomy Choice pre-classifier; citation-check
  Noul for claim-evidence support; composite dimension scores, thresholds
  tunable without re-inference.
- Boundaries: typed output guarantees interface, not truth — calibrate on
  repo data; Jev never replaces fresh-context doubt or human L0 gates.
- Prerequisite: TypeSafe API credential (server-side). Until set, gates
  run in degraded mode (frontier/small-model judges) and say so.

## 8. Memory (better than brain/)

- Records: decision/contract/finding/assumption with status, confidence,
  citations, expiry, supersedes-links. JSONL + SQLite FTS + typed filters.
- Decay: expired/low-confidence surface for re-verification, never rot.
- Contradictions open reconcile tasks (memory doubt cycle), never silent
  overwrite. Lane scratch sealed unless merge-gate promotes it.
- Quarantined lanes: scratch frozen/labeled, siblings on last-good,
  oracle refuses quarantined paths until human clears.
- Handoffs generated from records (extends aegis resume packs); brain/
  markdown stays as rendered view via sync.

## 9. Margin Format + linter (anti-hallucination, token-optimal)

- Frontmatter (fixed order): name, version, triggers, not-triggers,
  inputs, outputs, chains-to, autonomy, tokens-budget.
- Body (fixed order): Overview ≤5 lines → When/When-NOT → Process
  checklist (action + verification command) → Verification → Red Flags →
  Interactions. Thick material in references/, one hop max.
- Laws: one concept per file; tables over prose; single-source (link,
  never copy); cite-or-stamp; negative rules over vague guidance;
  paired correct/wrong examples.
- Budgets: phase skill ≤80 lines, sub-skill ≤120, reference ≤200.
- `aegis lint-skills`: frontmatter validity, budget overruns, broken
  links, trigger collisions (global registry). Skills are CI-checked.
- Eval harness: trigger precision + contract compliance, run on
  free/small models. Below threshold = rewrite.
## 10. Prototype track (visual direction decided here or nowhere)

- UI work: full HTML prototype (palette, type, components, states,
  exact working style) approved at demo gate before production lanes.
- Non-UI work: contracts + sequence + sample trace as the "demo".
- Fidelity scales with UI surface (rule in CONSTRAINTS.md).
- Approved demo → derived md/contracts frozen → lanes build to those.
  Pixel intent never re-interpreted downstream.

## 11. Quality phase (05b) + simulations

- Binary per-gate verdicts (evidence-attached); dimension scores for
  trends only — no compensating ("fast but wrong" fails).
- Drafting checklist in CONSTRAINTS.md: correctness, robustness,
  performance budgets (p50/p99, bundle/query), security patterns,
  readability caps. Mechanical fail, never taste.
- Simulation tiers with artifacts: property/fuzz vs contracts; replay
  (recorded traffic/seeded scenarios); load vs budgets; chaos (kill
  dependency, expire credential, corrupt input). No artifact = UNMEASURED
  = fail. Mutation testing above unit tests (surviving mutants = theater).

## 12. Multi-agent protocol

- Roles: conductor (dispatch from CLI state), lane workers (one
  slice/worktree/checklist), fresh-context reviewers (artifact+contract
  only), researcher (Loop C), Jev judges (typed verdicts).
- Waves: decompose → contracts merged → N lanes (cap) → review →
  oracle → next. One slice per agent per wave.
- Blackboard only: files + CLI state. No agent-to-agent messages, no
  persona-spawns-persona. `aegis exec` records every run (audit/replay).
- Idempotent resumable lanes (checkpoints + reconstruction packs).

## 13. Dependency law (no mess)

- Slices depend only on merged contracts, never unmerged sibling work
  (AST check at merge). Shared code goes UP into contracts, never
  sideways. Per-slice dependency budget forces splits. One owner per
  path per wave. Every file maps slice → contract → evidence → blueprint;
  orphans fail the gate.

## 14. Acceptance (all must hold)

1. Free/small-model pilot ships a small feature on start/approve/ship
   alone. 2. Trigger evals pass; phase token spend trends down.
3. Zero gate passes without evidence; zero unbounds except demo loop.
4. No file over budget; no duplicated concept; slop gate clean.
5. Aegis dogfoods the spec on itself with changelog.

## 15. Build order

1. Margin Format conformance pass on existing 68 files (keep/rewrite/
   split/delete) + lint-skills MVP. 2. CONSTRAINTS.md + autonomy patterns
   + default-deny. 3. Loop-until-clean + quarantine in CLI.
4. Record memory beside brain/. 5. Jev wiring (post-credential).
6. Demo-approval gate + prototype track. 7. Eval harness on small models.
8. Pilot, dogfood, version, changelog.
