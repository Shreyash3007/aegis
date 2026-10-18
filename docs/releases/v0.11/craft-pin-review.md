# Craft pin review: v6.4.2 baseline vs upstream v7.0.0

Scope (v0.11 R6): the v0.10 baseline left the question open - "A newer upstream
v7 tag exists; it is not silently substituted for this baseline." This review
answers it with source evidence and a recorded bump-or-keep decision.

**Decision: KEEP `v6.4.2` (commit `8ca22dba`). `skills/superpowers.lock.json`
is unchanged.** A bump becomes available again only with the additions listed
under "What a future bump must add" (SUPERPOWERS.md "Intentional upgrades").

## Source checks (local pinned checkout; nothing upstream executed)

- `git ls-remote --tags origin "refs/tags/v7*"` → tag object `7f043e5eaf35`,
  peeled commit `bb92a77741419a4ab5f06e711a283343f1ada0c3`, released
  2026-10-09 ("Release v7.0.0: rebuilt brainstorming, Antigravity Marketplace
  manifest, Windows hook fixes (#2489)"). Baseline v6.4.2 is 2026-09-25.
- `git fetch origin tag v7.0.0`, then `git rev-parse "v7.0.0^{}:<path>"` for
  the six pinned paths. All six paths still exist; three blob IDs moved:

  | pin | v6.4.2 blob | v7.0.0 blob | moved |
  |---|---|---|---|
  | brainstorming | `e3f17885` | `22b98fc5` | yes (rewritten) |
  | test-driven-development | `46838cc9` | `46838cc9` | no |
  | systematic-debugging | `095d194a` | `62fc752a` | yes (4 lines) |
  | requesting-code-review | `6d995da5` | `68d338a5` | yes (2 lines) |
  | using-git-worktrees | `1381dacb` | `1381dacb` | no |
  | verification-before-completion | `7d45333c` | `7d45333c` | no |

- License unchanged at v7.0.0: MIT (Copyright (c) 2025 Jesse Vincent).
- Diff scope `git diff --stat 8ca22dba v7.0.0 -- skills/`: 8 files changed,
  +240/−321. brainstorming `SKILL.md` rewrites 466 lines, adds
  `builder-check-prompt.md` (+23), removes `spec-document-reviewer-prompt.md`
  (−49); requesting-code-review `SKILL.md` 2 lines; systematic-debugging
  `SKILL.md` 4 lines; the rest are script tweaks.
- Current baseline re-verified today (SUPERPOWERS.md step 3, source-lock):
  `aegis blade resolve <name> --root <checkout>` for all six pins →
  `OK blade VERIFIED ... v6.4.2 <blob>` with the pipeline/gates authority and
  collision rules printed.

## What changed in the three moved pins

- **systematic-debugging (4 lines)**: the secrets-presence check modernized
  (`env | grep IDENTITY` → `printenv IDENTITY`). Aligned with the existing
  collision rule; a welcome fix, but not upgrade-driving on its own.
- **requesting-code-review (2 lines)**: `awk '{print $1}'` → `cut -d' ' -f1`.
  Same class.
- **brainstorming (rewritten)** - the review's center of gravity. The v7
  candidate (line refs to the fetched blob) adds machinery that did not exist
  in the pin:
  - line 157: a written design committed to
    `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` - a concrete spec
    path in the target repository;
  - lines 160-177: "Builder check" - dispatch a fresh general-purpose
    subagent over the design document and feed its questions back;
  - lines 179-193: an explicit `<HARD-GATE>` - nothing gets built until the
    human approves, then (line 192) "invoke `superpowers:writing-plans` and
    no other skill";
  - lines 107-109, 187-189, 203: spikes bypass the plan/implementation/review
    sequence ("Spikes get no tests ... and review process"); a spike the
    human approved "may be built" outside the gate;
  - lines 92, 125-127, 222-224: a "visual companion" (local server +
    `visual-companion.md`) offered whenever the human would benefit from
    seeing a mockup;
  - the trigger description widens to "any creative work ... in software or
    out of it".

## Collision assessment

- The three unchanged pins move nothing; the two small fixes would only ride
  along with the brainstorming rewrite, because the lock pins all six at one
  commit - the review's cost is dominated by the one rewritten skill.
- Each new v7 brainstorming affordance collides with an existing Aegis rule
  and would need its own collision text in the lock before adoption:
  - builder-check subagent dispatch = the agent-to-agent class the review
    pins already restrict ("Reviewers cannot approve human gates or
    recursively dispatch more agents");
  - HARD-GATE + mandatory `superpowers:writing-plans` = the second-orchestrator
    class the v6 rule text already names, now hardened upstream into an
    explicit gate;
  - spike exceptions = code built outside the plan/review sequence, which
    collides with lane discipline and the DEMO gate ("never build unlabeled
    code in production lanes");
  - the committed spec path = PRD/design authority stays with 01a/01c; an
    upstream design doc is craft output, not the frozen PRD;
  - the visual companion server = a tool surface to scope explicitly
    (demo/prototype affordance only, never pre-approval production behavior).
- SUPERPOWERS.md step 4 for a bump requires representative discovery/TDD/
  review exercises with the new text, published with outcomes. A live
  discovery scenario against the rewritten, interactive brainstorming
  procedure has not been run, and must not be claimed from a static read.
  That requirement is part of why this review ends at KEEP, not a bump.

## Trigger fixtures (the R6 deliverable that outlives this decision)

- `test/fixtures/craft-triggers.json`: 12 cases - 6 positive (one per pin,
  expecting the pin's native fallback skill) and 6 negative (prompts that
  must route elsewhere). Committed and pinned by
  `test/adverse-scenarios.test.js` ("craft triggers: the committed fixture
  is consumable and covers every pin"), which checks structure, per-pin
  coverage, fallback agreement with the lock, and that
  `aegis eval trigger --file ... --threshold 0` accepts the fixture in the
  installed scope and accounts every case under the keyless mock backend
  (an unknown skill id would exit 2).
- UNMEASURED here, and labelled so: live trigger precision needs a real
  judgment backend and remains an owner-run exercise.
- These fixtures are the foundation for the negative-trigger evidence
  SUPERPOWERS.md step 3 asks for; its source-lock part is covered by the
  `aegis blade resolve` runs above and by the routing/blade tests in the
  suite battery.

## What a future bump must add

1. New collision rules for the five brainstorming affordances above,
   reviewed in the lock diff (step 2).
2. Representative discovery/TDD/review exercises with the v7 text and their
   published outcomes (step 4) - the fixtures exist; a live precision run
   stays owner-run.
3. The lock swap itself: tag/commit advance to `v7.0.0`/`bb92a777`, three
   blob IDs move and three stay, plus a successor record - never a rewrite
   of this one.

## Honesty notes

- Nothing upstream was executed; this review is reading plus object-ID
  arithmetic over a locally fetched, immutable tag.
- No model judged the skills; every claim above is diff output, line refs or
  command output with the command named.
- Line numbers refer to the fetched v7 blob as reviewed; the durable
  evidence is the object IDs.
