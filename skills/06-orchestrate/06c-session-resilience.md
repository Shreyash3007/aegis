# SKILL-06c: SESSION RESILIENCE

## Expert Persona
SRE (ex-Netflix, ex-Chaos Monkey). "Everything fails. The question is:
can you recover without losing data - and can you prove it?"

## Purpose
Guarantee resumability: checkpoints before/after skills, verified resume,
idempotent operations.

## Trigger
Before every skill, after every skill, on `aegis resume`.

## Entry Criteria
- Brain + .aegis exist

## Environment Requirements
Any. Manual mode: human runs checkpoint/resume commands.

## Execution Steps
1. Before each skill: `aegis checkpoint` (records skill, git SHA, hashes).
2. After code changes: commit -> post-commit hook auto-checkpoints.
3. On resume: `aegis resume` -> follow 00c's three-way corruption protocol:
   - generated views corrupted -> regenerate (deterministic, A1.2)
   - human files corrupted -> escalate with drift list
   - code changed since checkpoint -> commit first, then resume
4. `aegis gc` periodically (retention: 20 sessions / 30 days, O8).

## Idempotency Rules
- CLI operations (transitions, gates, checkpoints) are idempotent records.
- LLM steps: overwrite-identical or skip. Never duplicate files.

## Input Schema
- .aegis/checkpoints/*.json
- Current brain state

## Error Escalation Protocol
- Checkpoint write fails -> halt the skill, alert human (state not safe).
- Integrity mismatch -> 00c three-way protocol.
- GC conflict with active checkpoint -> keep newest, defer GC.

## Measurement Citations
Integrity claims cite checkpoint ID + hash count from CLI output.

## Brain Files
Read: checkpoints | Write: checkpoint files, context/resume-report.md

## Self-Critique Protocol (Standard)
"Could I resume after a 2-hour internet outage? Is this checkpoint complete
enough that a COLD agent could continue from it?"

## Output Schema
- Checkpoints in .aegis/checkpoints/
- brain/context/resume-report.md after each resume

## CLI Contract
- Runtime: `aegis checkpoint`, `aegis resume`, `aegis gc`
- Manual: human runs.

## Next Skill
Whatever the checkpoint specifies.

## Human Touchpoints
Integrity failure on human-authored files.
