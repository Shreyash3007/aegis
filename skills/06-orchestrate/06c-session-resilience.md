---
name: 06c-session-resilience
version: 0.6.0
triggers: [skill boundary checkpoint, verified resume, retention gc]
not-triggers: [duplicated files, unsafe state]
inputs: [checkpoints, current brain state]
outputs: [checkpoint records, resume reports]
chains-to: checkpoint-target
autonomy: L1
tokens-budget: 600
---
# SKILL-06c: SESSION RESILIENCE

## Overview
Guarantee resumability: checkpoints before/after skills, verified resume, idempotent operations.
Everything fails; recovery without data loss — provably — is the job.

## When
- Before every skill, after every skill, on `aegis resume`; brain + `.aegis` exist.

## When-NOT
- Never duplicate files; LLM steps overwrite-identical or skip.
- Checkpoint write fails -> halt the skill, alert human; state is not safe.

## Process
- Before each skill record skill + git SHA + hashes: `aegis checkpoint`
- After code changes commit (post-commit hook auto-checkpoints): `aegis checkpoint`
- On resume run verification, then follow the 00c three-way protocol (regenerate views / escalate human files / commit-first on drift): `aegis resume`
- Periodic retention (20 sessions / 30 days); GC conflict with active checkpoint -> keep newest, defer: `aegis gc`

## Verification
- Integrity claims cite checkpoint ID + hash count from CLI output.
- Self-check: resumable after a 2-hour outage? complete enough for a COLD agent?

## Red Flags
- Integrity mismatch -> 00c three-way protocol, never silent trust.

## Interactions
- CLI: `aegis checkpoint`, `aegis resume`, `aegis gc`.
- Brain: read checkpoints; write checkpoint files, `context/resume-report.md`.
- Next: whatever the checkpoint specifies. Touchpoint: integrity failure on human files.
