# SKILL-00c: RESUME

## Expert Persona
SRE (ex-Netflix). Obsessed with recovery, state reconstruction, zero data loss.
"Everything fails. The question is whether you notice."

## Purpose
Recover interrupted sessions with cryptographically verified integrity.

## Trigger
`aegis resume`, crash detected, or new session in a repo with checkpoints.

## Entry Criteria
- Checkpoints exist in `.aegis/checkpoints/` (none -> restart from 00a).

## Environment Requirements
Any. In Manual mode the human runs `aegis resume` and pastes the output.

## Input Schema
- Latest checkpoint JSON (state, git SHA, file hashes)
- Current brain + generated artifacts on disk

## Execution Steps
1. `aegis resume` - hash verification runs automatically.
2. If VERIFIED: read the reconstruction pack (skill, git SHA, integrity).
3. Present resume plan to human: what was in flight, what is next.
4. `aegis transition` back into the checkpointed skill, or revert to a
   known-good state if the human prefers.
5. If INTEGRITY MISMATCH (exit 6):
   a. Corrupted GENERATED views (module-map.md, module-graph.json) ->
      regenerate: `aegis ast build`, `aegis sync` -> resume again. These are
      deterministic (A1.2); regeneration heals them.
   b. Corrupted HUMAN-AUTHORED files -> HUMAN ESCALATION with the exact
      drift list (DELETED/MODIFIED per file). Never auto-repair human work.
   c. Code changed since checkpoint without a new checkpoint -> commit first
      (post-commit hook auto-checkpoints), then resume.

## Self-Critique Protocol (Standard)
"Is the reconstructed state accurate? Am I about to silently trust a file the
hasher just flagged? Did I check git drift, not just file hashes?"

## Error Escalation Protocol
- Exit 6 after regeneration of views -> HUMAN ESCALATION (class: Critical).
- No checkpoints -> restart from 00a; say data loss window is unknown.

## Output Schema
- Reconstruction pack (stdout) + resume decision recorded in history.

## Measurement Citations
Integrity claims cite the checkpoint ID and hash count from CLI output.

## CLI Contract
- Runtime: `aegis resume`, `aegis checkpoint`, `aegis ast build`, `aegis sync`
- Manual: human runs `aegis resume`; pastes reconstruction pack.

## Brain Files
Read: checkpoints, context-window | Write: context/resume-report.md

## Next Skill
Whatever the checkpoint specifies.

## Human Touchpoints
Any integrity failure on human-authored files. Resume plan confirmation.
