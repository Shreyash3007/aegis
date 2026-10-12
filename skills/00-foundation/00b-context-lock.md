---
name: 00b-context-lock
version: 0.6.0
triggers: [setup interview, lock manifest, 00b context lock]
not-triggers: [skipping questions, assuming stack]
inputs: [stack files, doctor report, existing config defaults]
outputs: [locked config, manifest.md with LOCKED header]
chains-to: 00d-brownfield, 01a-prd
autonomy: L1
tokens-budget: 1200
---
# SKILL-00b: CONTEXT LOCK + SETUP INTERVIEW

## Overview
Lock tech stack, environment, and operating preferences through a full interview.
No architecture without a locked manifest. No budget questions.

## When
- After 00a completes; governs agent-driven re-interviews and corrections.
- Any manifest change (header reads LOCKED for a reason).

## When-NOT
- Stack evidence is missing — ask, never assume or proceed on defaults.
- Rushing: skipping a question because the answer "feels obvious" is a defect.

## Process
- Detect stack from repo files; state detection + evidence, never assumption: `aegis doctor`
- Ask ONE question at a time (platform, project type, stack, hardware, parallelism, autonomy, model tiers, risk tolerance, team, ship target); record each via its exact config key: `aegis config set <key> <value>`
- Write `brain/context/manifest.md` with locked stack, constraints, anti-goals: `aegis config`
- Define anti-goals explicitly ("we will NOT build X"): `aegis config`
- Advance only on explicit human "locked": `aegis transition`

## Verification
- Every manifest claim backed by a file or an answer; no assumed stack, no skipped question.
- Hardware/environment facts cite `aegis doctor` output.
- Unknown config keys are CLI-refused (exit 4) with the valid key list — a passing interview never contains one.

## Red Flags
- Stack undetectable -> ask human, never guess.
- Conflicting signals (two lockfiles, mixed configs) -> flag, human decides.
- Manifest edited without human approval -> treat as tamper, re-lock.

## Interactions
- CLI: `aegis config`, `aegis config set <key> <value>`, `aegis transition`
- Brain: read repo stack files; write `context/manifest.md`; update `context-window.md`.
- Next: `00d-brownfield` or `01a-prd`. The interview IS the human touchpoint.
