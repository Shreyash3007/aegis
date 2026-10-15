# Superpowers craft integration

Aegis remains usable without Superpowers, any particular model, or an
installed host plugin. Its native procedures are always the fallback.
This is selective source routing, not a merged pipeline or a fork.

## Verified baseline

Upstream: `obra/superpowers`, MIT. Integration baseline: `v6.4.2`, commit
`8ca22dba9a94f28898bbce59f2537ff4d87c747d`. Six Git blob IDs are recorded in
`skills/superpowers.lock.json`, fetched from the upstream Git tree. A newer
upstream v7 tag exists; it is not silently substituted for this baseline.

The six routes cover discovery, TDD, debugging, review, worktree hygiene,
and completion verification. Each pin declares an Aegis-native fallback
and collision rules. In particular:

- Never delete unfamiliar code because an upstream skill says to start over.
- The Aegis slice registry—not an independent worktree procedure—owns lanes.
- Reviewers cannot approve human gates or recursively dispatch more agents.
- A verified source file is not proof of having executed its procedure.

## Loading guidance

`aegis blade list` shows the routes. With a user-installed upstream checkout:
`aegis blade resolve brainstorming --root <checkout>` verifies the exact
skill bytes against the lock. It prints a source path if verified; otherwise
it prints UNMEASURED and the native fallback path. It installs nothing,
executes no downloaded code, and changes no global host settings.

Run this resolution before reading the skill. Apply the listed collision
rules and record your actual test/review evidence through Aegis. Upstream
Markdown is guidance; the CLI checks actual receipts and state.

After upgrading Aegis in an existing project, `aegis sync --refresh-skills`
updates its installed native procedures and source lock without resetting
the pipeline or brain. The prior skill snapshot is preserved locally.

## Intentional upgrades

1. Review upstream changes and license at the new immutable commit.
2. Update the six object IDs and review every collision rule.
3. Run source-lock, routing, skill lint and negative-trigger tests.
4. Run representative discovery, TDD and review scenarios; publish changed
   outcomes and any regressions. Do not reuse an old evaluation as new proof.
5. Commit the lock with the integration change. Never auto-update it at startup.
