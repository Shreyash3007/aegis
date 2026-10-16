# Aegis v0.10.0 — Grade

This release adds a CLI quality floor and repairs the implementation behind
it. It does not claim improved model effectiveness from pipeline traversal.

## Main changes

- Recorded RED/GREEN, committed acceptance plans and review blockers, checked
  against exact source commits and rerun on the integrated tree.
- Canonical ref handling, strict flag validation and round-trip-safe recovery
  commands. Existing evidence and quarantine cannot disappear through aliases.
- Owned state/lifecycle locks, recoverable memory transactions, conflict-safe
  legacy migration and worktree removal that preserves local work.
- Complete integrity inputs, consistent checkpoint positions and source-bound
  human G4 approval. Old approvals cannot authorize new commits or open lanes.
- Correct failure reporting for audit/tool/monitor inputs, bounded HTTP reads,
  literal exec argv and owned descendant cancellation.
- Six pinned optional Superpowers craft sources with explicit Aegis collision
  rules, native fallbacks, caller-reported usage and private-safe observations.
- Fresh-source release checks and an actually verified distribution artifact.
- Corrected landing-page muted-text contrast and footer-link distinction,
  with historical metrics and unmeasured effectiveness clearly labelled.

## Installation and compatibility

Use Node 20 or 22+ and Git. Node 18 support was removed because the repaired
glob dependency requires the newer runtime range. This is a pre-1.0 minor
release with new refusal behavior; malformed or ambiguous inputs that used
to be ignored may now fail explicitly.

Download `aegis-0.10.0.tgz` and its SHA256 sidecar from this release. The built
asset includes compiled code, the consumer shrinkwrap and bundled runtime
dependencies. Installation needs no package build scripts:

```sh
npm install -g --ignore-scripts https://github.com/Shreyash3007/aegis/releases/download/v0.10.0/aegis-0.10.0.tgz
```

Older updaters used generated source archives. Upgrade to this asset explicitly.
The new updater selects built release assets and disables installation scripts.

For an existing project, first inspect/reconcile any legacy memory conflict or
pending journal. Refresh native procedures with `aegis sync --refresh-skills`.
Review added integrity inputs before taking a fresh checkpoint. G4 needs fresh
human approval for the actual source commit, not a stale v0.9 sign-off.

## Verification and limits

The attached release/package evidence binds the tested source SHA, CI run,
command results, installed dependency versions and artifact digest. See the
source release contract and audit ledger for finding-level regression links.

Legacy missing receipts need the explicit strict flags; enrolled receipts are
always checked. Skills remain guidance, approvals are attributed audit trails,
and unrestricted shell actors are outside the CLI's safety boundary. Structural
doc checks are not semantic proofs. Power-loss durability, general small-model
effectiveness and comparative quality/cost advantages remain unmeasured.

The updated v0.11 plan is queued: explicit strict-profile migration, thin
host adapters with real capability evidence, immutable evidence publishing,
and an owner-selected real small-executor delivery trial. Model routing is
still deferred. No adapter, community study or small-model trial is represented
as already implemented by this release.
