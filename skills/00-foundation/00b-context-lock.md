# SKILL-00b: CONTEXT LOCK + SETUP INTERVIEW

## Expert Persona
Staff Engineer (Google L6). Refuses to start work without locked constraints.
"No architecture without a locked manifest."

## Purpose
Lock tech stack, environment, and operating preferences through a full
interview. NO budget questions (budgets are dropped from Aegis, D4).

## Trigger
After 00a completes (`aegis init` runs the interview inline; this skill governs
agent-driven re-interviews and corrections).

## Entry Criteria
- `.aegis/config.json` exists (created by init).

## Environment Requirements
Any. Interactive in Runtime mode; question-by-question in Manual mode.

## The Interview (ONE question at a time, [Recommended] flagged)
1. Platform: kimi-code / claude-code / cursor / opencode / api / chat
2. Project type: greenfield / brownfield (brownfield routes to 00d)
3. Tech stack (auto-detect from repo files; human confirms or corrects)
4. Hardware (auto-detected by doctor; human confirms)
5. Parallelism appetite: max concurrent local sessions (caps lanes below hardware ceiling if desired)
6. Autonomy mode: assisted / semi / full (affects APPROVAL-tier gates only; SACRED untouched)
7. Model access & quality tiers: strongest model for architecture/security/PRD;
   standard for codegen; light for docs/boilerplate (quality-driven, not cost)
8. Risk tolerance: auto-approve APPROVAL gates? confirm each slice merge?
9. Team context: solo / small team (docs depth)
10. Ship target: prototype / production (gate profile, O6)

## Execution Steps
1. Detect stack from repo files (package.json, tsconfig, lockfiles). State what
   was detected and the evidence. NEVER assume.
2. Ask each interview question; record answers via `aegis config set <key> <value>`.
3. Write `brain/context/manifest.md`: locked stack, constraints, anti-goals.
4. Define anti-goals explicitly ("we will NOT build X").
5. `aegis transition` to next skill.

## Input Schema
- Repo stack files (package.json, lockfiles, tsconfig)
- Doctor report (hardware, platform, environment level)
- Existing `.aegis/config.json` defaults

## Self-Critique Protocol (Standard)
"Did I assume a tech stack? Did I skip a question because the answer felt
obvious? Is every manifest claim backed by a file or an answer?"

## Error Escalation Protocol
- Stack undetectable -> ask human (never guess).
- Conflicting signals (two lockfiles, mixed configs) -> flag, human decides.

## Output Schema
- `.aegis/config.json` (via CLI)
- `brain/context/manifest.md` (locked; header: LOCKED - changes require human approval)

## Measurement Citations
Hardware/environment facts cite `aegis doctor` output.

## CLI Contract
- Runtime: `aegis config`, `aegis config set <key> <value>`, `aegis transition`
- Manual: human runs; agent reads output.

## Brain Files
Read: repo stack files | Write: context/manifest.md | Update: context-window.md

## Next Skill
00d (brownfield) or 01a (greenfield)

## Human Touchpoints
The interview IS the touchpoint. Manifest lock requires explicit human "locked".
