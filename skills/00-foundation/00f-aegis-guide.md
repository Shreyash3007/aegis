---
name: 00f-aegis-guide
version: 0.6.0
triggers: [guide me, walk me through aegis, first session setup]
not-triggers: [lecturing, deciding autonomy for the human]
inputs: [human answers, doctor output, repo signals]
outputs: [verified setup, recorded config reasons, teach-back pass]
chains-to: 00e-ask-aegis, 00d-brownfield, 01a-prd
autonomy: L1
tokens-budget: 1500
---
# SKILL-00f: AEGIS-GUIDE (INTERACTIVE ONBOARDING)

## Overview
Turn "I don't know how Aegis works" into a configured, understood setup through conversation.
The agent DOES the work, EXPLAINS each step before doing it, and ASKS only when a real decision is needed.

## When
- Human says "guide me" / "walk me through" / "set this up for me", or first session with no `.aegis/` and visible uncertainty.
- Any knowledge level; assume ZERO prior context, define every term on first use.

## When-NOT
- Never lecture (one line per concept), never repeat the same paragraph louder on confusion.
- Never decide autonomy FOR the human; never mutate without consent; never pretend enforcement ran in Manual mode.

## Process
- ASSESS silently (git repo? `.aegis/`? doctor if initialized); state position in ONE plain paragraph, no jargon: `aegis doctor`
- EXPLAIN the big idea in exactly three sentences (agents ignore prompts; CLI enforces in code; you talk normally), then ask 2-minute version vs setup: `aegis status`
- If NOT initialized: explain `init` effects BEFORE running (gitignored `.aegis/`, committed `brain/`, chained hooks, stock skills); get consent, run: `aegis init --yes`
- INTERVIEW conversationally, one question + recommendation + one-line why each (work style -> autonomy; solo/team; prototype/production; monorepo apps); record via exact keys: `aegis config set`
- SHOW the state machine via live status (named stages, refused jumps, five human gates): `aegis status`
- TEACH the two daily moves with a consent-first live micro-example (fix start/done; chore); offer a real first chore: `aegis fix start`
- TEACH the safety net one line each (resume recovery, doctor drift, commit/push hooks): `aegis checkpoint`
- TUNE for style (AFK -> wave block + attention report; team -> gate flow; ceremony-hater -> minimal profile): `aegis wave`
- VERIFY + HANDOFF: checkpoint, status, refreshed handoff; brownfield -> offer 00d; give the THREE commands (status, fix, doctor): `aegis status --markdown`

## Verification
- Setup works (checkpoint + status clean); config reasons recorded in conversation.
- Human can name the 3 daily commands, what a gate is, where state lives — else re-teach.
- Every claim shown cites its producing command; nothing asserted from memory.

## Red Flags
- Human confused -> new concrete analogy, never repetition.
- Command fails -> exact error + one-line explanation + proposed fix; ask before applying.
- Not a git repo -> offer `git init` walkthrough or stop cleanly.
- Human declines a step -> skip, note what remains unconfigured, continue.

## Interactions
- CLI: `aegis init`, `aegis doctor`, `aegis status`, `aegis config set`, `aegis fix start|done`, `aegis chore`, `aegis checkpoint`, `aegis wave`, `aegis status --markdown`
- Brain: read handoff/context-window; all writes through CLI so checkpoints stay consistent.
- Next: `00e-ask-aegis` (daily) | `00d-brownfield` (existing code) | `01a-prd` (greenfield). Consent gates every mutation.
