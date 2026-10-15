# v0.10 release contract

## Owner request

“audit the complete till now implementation and the forward going implement
plan find the bugs errors and fix the current and then release the v.10
correctly and then we will proceed with the updated v0.11”

This authorizes the current audit/repair/release work. It does not turn an
old v0.9 approval into a fresh v0.10 approval, authorize model routing, or
start the queued v0.11 implementation.

## What this release delivers

The CLI quality floor: recorded RED/GREEN, committed acceptance and review
evidence, source-bound merge verification, owned state/memory operations,
pinned optional craft sources, explicit resource limits, privacy-qualified
measurement and a verified built distribution. New refusal behavior and
the Node 20-or-22+ requirement are intentional v0.10 compatibility changes.

The audit must preserve existing tests and owner files. Fixes have negative
controls/reproductions, not just extra happy-path checks. Same-model fresh
reviewers are independent contexts, not an independent effectiveness study.

## Must pass before publication

1. Fresh build, complete tests, deterministic skill lint and dependency audit.
2. Adversarial harness and new audit regressions, including filesystem loss,
   concurrency, malformed evidence, ref identity and deadline failure paths.
3. Real disposable feature: RED, minimal fix, GREEN, acceptance, review
   refusal/repair, integrated merge, source-bound approval and recovery.
4. Pinned optional craft verification and an honest procedure-use record.
   Byte verification and manual procedure use remain distinct evidence.
5. Installed artifact: compiled CLI, consumer lock and bundled runtime;
   isolated offline installation with scripts disabled, expected dependency
   versions, version/help/init behavior and published SHA256.
6. Exact-final-commit Ubuntu Node 20/22 and Windows Node 22 CI, including
   package install verification, and the full seven-check release ritual.
   `--local` is not release clearance.
7. No open release-blocking audit finding. Active lanes safely closed.
8. Fresh human G4 for the exact candidate commit. An old or source-mismatched
   approval refuses ship entry. No agent-created approval token or posture change.
9. Immutable v0.10.0 tag, built asset/checksum/evidence published, and live
   release/site references verified. Never move a published version tag.

`GATES.md` contains runnable acceptance definitions. Its source definitions
precede final CI/publication; evaluated results belong to immutable command
observations and the release evidence sidecar, not fabricated self-referential
proof embedded in the source commit.

## Limits that must stay visible

- Skills and discovery lenses guide behavior; the CLI cannot prove taste,
  customer truth, review adequacy, or compliance by an unrestricted shell actor.
- Legacy unenrolled branches require explicit strict flags for absent receipts;
  existing receipts are always checked. The strict-project migration is v0.11.
- Doc-style contract checks are structural heuristics, not semantic proof of
  an interface. Compiler checks and immutable diffs have their own narrower scope.
- Tokens/cost may be executor-reported or unknown. Judgment counts are not billing.
- The scripted smoke is not a small-model delivery trial. The calibration bank
  is not an independent benchmark. Neither is represented as completed research.
- Filesystem ownership checks coordinate CLI participants, not an OS sandbox.
  Malformed locks and conflicting recovery data fail closed. Power-loss/fsync
  durability and arbitrary external writers are not claimed as measured.

These limits are carried into the updated v0.11 plan and the human verdict;
they are not silently renamed completed gates of the earlier draft vision.

## Rollback

Keep the v0.9.0 tag immutable. Prefer holding the new release or publishing a
successor fix rather than downgrading a data-safety repair. Before any downgrade,
preserve committed `brain/memory/`, inspect pending recovery journals, and take
an owner-reviewed machine-state backup. Older CLIs do not understand all new
integrity inputs or approval freshness; never use downgrade to bypass refusal.
