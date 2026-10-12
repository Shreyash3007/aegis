---
name: 00c-resume
version: 0.6.0
triggers: [aegis resume, crash recovery, session checkpoint restore]
not-triggers: [fresh start, silent trust of flagged files]
inputs: [checkpoint JSON, current brain and artifacts]
outputs: [reconstruction pack, resume decision in history]
chains-to: checkpoint-target
autonomy: L1
tokens-budget: 800
---
# SKILL-00c: RESUME

## Overview
Recover interrupted sessions with cryptographically verified integrity.
Everything fails; the question is whether you notice.

## When
- `aegis resume` runs, a crash is detected, or a new session finds checkpoints.
- Checkpoints exist in `.aegis/checkpoints/` (none -> restart from 00a).

## When-NOT
- No checkpoints — restart from 00a and say the data-loss window is unknown.
- Never silently trust a file the hasher just flagged.

## Process
- Run hash verification automatically: `aegis resume`
- If VERIFIED: read the reconstruction pack (skill, git SHA, integrity): `aegis resume`
- Present resume plan (what was in flight, what is next); confirm with human: `aegis status`
- Transition back into the checkpointed skill, or revert to known-good on human preference: `aegis transition`
- If INTEGRITY MISMATCH (exit 6): corrupted GENERATED views -> regenerate and retry: `aegis ast build`
- If INTEGRITY MISMATCH (exit 6): corrupted GENERATED views -> regenerate and retry: `aegis sync`
- If INTEGRITY MISMATCH (exit 6): corrupted HUMAN-AUTHORED files -> HUMAN ESCALATION with exact drift list, never auto-repair: `aegis resume`
- Code changed since checkpoint without a new checkpoint -> commit first, then resume: `aegis checkpoint`

## Verification
- Integrity claims cite checkpoint ID and hash count from CLI output.
- Reconstruction accuracy self-check: git drift examined, not just file hashes.
- Resume decision recorded in history.

## Red Flags
- Exit 6 persists after view regeneration -> HUMAN ESCALATION (Critical).
- Auto-repairing human-authored work is forbidden.

## Interactions
- CLI: `aegis resume`, `aegis checkpoint`, `aegis ast build`, `aegis sync`
- Brain: read checkpoints, context-window; write `context/resume-report.md`.
- Next: whatever the checkpoint specifies. Touchpoints: integrity failures, resume-plan confirmation.
