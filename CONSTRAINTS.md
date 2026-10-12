# CONSTRAINTS.md (v0.6.0-draft) — the written quality bar

Weakening any threshold below is a contract change: it needs a reason recorded in history, not a silent edit. Agents do not lower the bar to reach green.

## 1. Autonomy ladder (mechanical classification)

Patterns match in the CLI first; Jev Choice is second opinion only, logged (wired as `aegis jev classify`). No match or low confidence floors at L1.

- **L0 human-only:** `prod|auth|payment|credential|ship|migration|external-send|legal|PII-export`. Sacred gates, TTY retype-to-confirm. No flag skips.
- **L1 supervised (default):** crosses a module boundary, unverifiable by compiler, or irreversible blast radius. Agent acts; doubt cycle + fresh review required; human approves the gate.
- **L2 autonomous:** mechanical, reversible, in-budget (tokens + lines + files, §3). Checklist + suite verify; batched log for async human review.
- **Fast lane:** fix/chore side track. Skips the funnel, never skips the suite.
- **Graduation:** L1→L2 only on measured clean runs. Unclassifiable work floors at L1 (default-deny).

Per-phase defaults: 00/01/02/03 = L1; 04 = L2; 05 = L1; 06 = L1; 07 = L2 (chores) else L1; 08 = L0.

## 2. Skill budgets (hard, checked by `aegis lint-skills`)

- Phase skill (`skill.md`): ≤80 lines. Frontmatter + budget only enforced; body keeps Purpose/Sub-Skills/Routing index shape.
- Sub-skill: ≤120 lines, full Margin Format body order.
- Reference (`references/`, `team-templates/`): ≤200 lines, one hop max, no frontmatter — budget + links only.
- Frontmatter fixed order: `name, version, triggers, not-triggers, inputs, outputs, chains-to, autonomy, tokens-budget`.
- Body fixed order: `Overview (≤5 lines) → When → When-NOT → Process (action + verification command per step) → Verification → Red Flags → Interactions`.
- One concept per file. Tables over prose. Link, never copy. Cite-or-stamp: every claim cites `file:line`/tool output or is stamped INFERRED/UNMEASURED/BLOCKED.

## 3. Evidence law

Zero gate passes without evidence. Every file maps slice → contract → evidence → blueprint; orphans fail the merge gate. Only the demo-iterate loop is unbounded; every machine loop carries a stop condition (3 cycles → escalate, exit 5 with evidence pack — enforced by `aegis clean`, failing lanes parked with `aegis quarantine`).

## 4. Judge thresholds (tunable without re-inference)

- Jev Noul triage: act only on findings with confidence ≥0.7; below = re-verify or escalate (enforced by `aegis jev triage`, threshold tunable per call).
- Trigger precision (`aegis eval trigger`): default threshold 0.8; below = rewrite the missed skills' triggers.
- Actionability Score per review cycle: all-noise cycles = doubt theater → escalate, never silent-pass.
- Citation-check Noul: claim without supporting evidence fails the gate.
- Degraded mode (no `TYPESAFE_API_KEY`): small-model/frontier judges, and the output says so verbatim (`aegis jev` prints DEGRADED on its first line).

## 5. Drafting checklist (mechanical fail, never taste)

Correctness (contracts hold, no phantom CLI refs) · Robustness (error paths explicit, no silent catch) · Performance budgets (p50/p99 stated, bundle/query caps) · Security patterns (§1 L0 list + input validation) · Readability caps (§2 budgets, no duplication).

## 6. UI fidelity

UI work locks full visual direction in an HTML demo before production lanes open. Pixel intent is never re-interpreted downstream. Fidelity scales with UI surface: no surface → contracts + sequence + sample trace recorded (`demo record --kind contract`); single flow → one HTML flow; full surface → full HTML prototype (palette, type, components, ALL states). The scale is human judgment at the DEMO gate; the mechanical part is artifact-recorded + gate-approved, enforced by `transition 04a` refusal. Non-UI work ships contracts + sequence + sample trace as its demo.

## 7. Simulation tiers (artifacts or UNMEASURED = fail)

Property/fuzz vs contracts · replay (recorded traffic/seeded scenarios) · load vs budgets · chaos (kill dependency, expire credential, corrupt input). Mutation testing above unit tests: surviving mutants = theater.
