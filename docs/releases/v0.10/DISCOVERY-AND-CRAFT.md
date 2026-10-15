# Actual discovery and craft exercise

## Evidence, not simulated stakeholders

The owner requested the implementation audit, fixes, correct v0.10 release
and a revised-but-not-started v0.11. The opening response reflected that scope
and retained the model-routing deferral. No customer interviews, customer
approval or cross-model judgments are invented here.

Product/design/engineering/QA/challenger are lenses over this shared brief:

- Product: a green test count alone does not satisfy “release correctly.”
  Require the installed artifact, correct approval and public evidence too.
- Design/UX: use consistent command scope and actionable refusal messages;
  remove the landing page's implication that the CLI proves procedure quality.
- Engineering: state and memory need owned transactions; source identity and
  evidence identity cannot be ambiguous. Reproduce before selecting repairs.
- QA: test malformed/absent/stale inputs, counter-examples and platform-specific
  behavior, not merely successful pipeline traversal.
- Challenger: fresh read-only reviewers found defects missed by the original
  205-test/153-check snapshot, and a second review found defects in repairs.

These are author-recorded perspectives and actual reviewer findings, not
six fabricated people agreeing in a product meeting. Unanswered user-research
and executor-effectiveness questions remain explicitly unmeasured.

## Conceptual model before an interface

Contracts: `src/contracts/commands.ts` owns the command/exit surface. Existing
module boundaries own state, memory, evidence, judgment and distribution.
This is non-UI behavior work; no application screen design is being inferred.

Sequence: owner brief → read-only findings → failing regressions → isolated
repairs → fresh review → integrated verification → source-bound human verdict
→ immutable package/tag → public verification. Aegis remains the orchestrator.

Sample trace from the actual audit: a committed negative test exposed
`deps: PASS` for an npm operational error; the repair now records UNMEASURED.
Another exposed `0/1 acceptance checks passed` with exit zero after a competing
receipt; the invocation must retain its own failing verdict. These traces are
linked to executable cases under `test/audit-*.test.js`, not a hypothetical UI.

## Selective pinned Superpowers use

Baseline and collision authority: `skills/superpowers.lock.json` and
`docs/SUPERPOWERS.md`. All six sources were verified at the locked Git blobs
and read in this session. Application evidence:

- Brainstorming: reflect the actual bounded audit/repair goal, distinguish
  requirements from assumptions, and do not invent user answers or a new pipeline.
- TDD: committed reproductions and observed failing runs precede repairs;
  stored RED/GREEN checks supplement the full suite, not replace semantic review.
- Debugging: failures are traced to the source boundary before fixes, including
  stale POSIX launcher links, unbounded streaming, and an omitted package lock.
- Review: scoped fresh-context reviewers receive artifacts/contracts, publish
  findings, and repairs are reconciled and reverified by the conductor.
- Worktrees: registered Aegis slices with bounded lanes and disjoint ownership;
  upstream native-worktree/fallback instructions do not create extra registries.
- Verification: fresh commands, exact-commit CI and installed artifact checks
  precede completion claims; synthetic gate fixtures stay labelled synthetic.

This is a manual procedure-use record with runnable supporting artifacts.
It is not automatic proof of agent compliance, a blinded assessment, or a
demonstration that adding the blades improved quality or reduced cost.
