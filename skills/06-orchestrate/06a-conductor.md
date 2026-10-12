---
name: 06a-conductor
version: 0.6.0
triggers: [conductor dispatch, pipeline position, loop escalation surfacing]
not-triggers: [playing instruments, blind retries, remembered state]
inputs: [status output, config autonomy mode]
outputs: [routing decision, recorded transition]
chains-to: transitions-per-state
autonomy: L1
tokens-budget: 800
---
# SKILL-06a: THE CONDUCTOR

## Overview
Read runtime state, decide the next skill, handle transitions, surface loops to the human.
The orchestra doesn't play without a conductor; the conductor doesn't play the instruments.

## When
- After any skill completes, on `aegis next`, or on human request; state file exists.
- Autonomy modes: assisted (suggest), semi (auto between SACRED gates), full (auto; SACRED still hard-stop).

## When-NOT
- Never reason from remembered state — CLI output is truth.
- Exit 4 (illegal): diagnose the blocker, never retry blindly.

## Process
- Read position, legal transitions, blockers, lanes: `aegis status`
- Get the ONE legal forward skill: `aegis next`
- Present position + recommendation + gates/loops/lanes; get human approval: `aegis status`
- On approval, record the transition: `aegis transition`
- Exit 5 (loop/cycle) -> STOP; present recurring state, last N transitions, resolution (rollback with reason or human decision): `aegis status`
- Checkpoint after every transition: `aegis checkpoint`

## Verification
- Routing claims cite status/next output verbatim.
- Self-check: reading or remembering? human about to be surprised? lane capacity checked?

## Red Flags
- Invalid state -> `aegis resume` to last checkpoint.
- Skill failure -> invoke 06e.
- Loop/cycle -> human, always.

## Interactions
- CLI: `aegis status`, `aegis next`, `aegis transition`, `aegis resume`.
- Brain: none directly (CLI state is truth).
- Next: whatever transitions.json allows + human approves. Touchpoints: every routing decision, all exit-5 escalations.
