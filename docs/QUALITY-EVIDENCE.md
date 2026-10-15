# Acceptance and review evidence

Use the user's chosen executor. No model routing is involved.

## Executable acceptance

Commit a JSON plan with `criteria`: 1–20 objects with unique `id`, an
observable `statement`, and a `command` argv array. Example criterion:
`{"id":"AC1","statement":"empty results render the empty state","command":["node","test/empty-state.cjs"]}`.

Run `aegis quality acceptance feature --file acceptance.json` from the main
checkout. Checks execute in the feature worktree. Each is bounded to 60
seconds, with a 120-second total budget. Timeout/error/nonzero means FAIL;
none of these are skips dressed as success. Committed plan/source and a
clean tree are required. Tests still need human review for adequacy.

## Review inputs with consequences

Commit a JSON plan with `findings`: objects with unique `id`, `summary`,
`severity` (`blocker`, `major`, `minor`, `note`), `status` (`open`, `resolved`),
and `evidence` paths committed at the feature tip. An empty array means the
reviewer reports no findings; recording it does not prove a review happened.

Run `aegis quality review feature --file review.json`:

- Open blocker/major: exit 9 and no merge. Blocker means revisit the relevant
  design contract; major means fix before merge. No silent auto-rollback.
- Minor/note: retained in the receipt for a follow-up backlog, not discarded.
- New branch commits stale both review and acceptance. Recapture after fixes.

`aegis clean feature --require-proof --require-quality` requires TDD,
acceptance and review evidence. Enrolled evidence is checked even without
the flags. The oracle also reruns acceptance checks on the merged tree.
Legacy branches without receipts are not retroactively claimed as reviewed.

## Limits and capture

`aegis wave --budget 100` declares a ceiling on logical judgment questions.
Reservations are atomic; oversize batches park before inference (exit 5).
Repeating the declaration does not reset it, and the active ceiling cannot
be raised silently. A reviewed `wave reset --reason` requires an externally
provisioned approval token. Failed transport is not refunded: a request may
already have reached the provider. Retries and dollar costs are not metered.

`aegis evidence usage --tokens-in 100 --tokens-out 20 --cost-usd 0.01` records
caller-reported usage, not independently verified billing. Omit unknown
fields. `aegis evidence export --file <successor.json>` exports aggregate
counts with provenance and null/UNMEASURED values, without prompts, commands,
model names or findings. It refuses to overwrite an existing observation.

Study prose belongs on the site. Local machine receipts support that prose;
private prompts, partner data and credentials must not be published.
