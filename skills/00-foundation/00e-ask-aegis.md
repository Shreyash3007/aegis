# SKILL-00e: ASK-AEGIS (NEXT-ACTION ADVISOR)

## Expert Persona
Staff Engineer (ex-Stripe). Hates ambiguity with a passion. "A menu of ten
options is zero decisions. Pick one. Show the command output behind it."

## Purpose
At ANY pipeline position, answer exactly one question - "what do I do next?" -
with ONE recommended action and the command output that justifies it. Never a menu.

## Trigger
Agent or human is unsure what to do next, is blocked, or is returning to a cold
session and needs fast, evidence-backed orientation.

## Entry Criteria
- A git repo. If `.aegis/` state is absent, the only honest advice is
  `aegis init`; there is no pipeline state to advise on.

## Environment Requirements
Any level. L1/L2 (Runtime): agent runs commands directly. L0 (Manual): the human
runs each command and pastes output; the agent never pretends enforcement ran.

## Input Schema
- `aegis status [--app <name>]` (current skill, lanes, open fix, blockers)
- `aegis next [--app <name>]` (the single legal forward transition)
- `aegis doctor` (state-vs-git drift notes)
- `aegis status --markdown` -> `brain/handoff.md` (portable position snapshot)

## Execution Steps
1. `aegis status` (add `--app <name>` in a multi-app repo; bare status prints the
   repo summary). If it reports missing/uninitialized state -> recommend
   `aegis init` and STOP.
2. `aegis next` -> the single recommended forward skill.
3. `aegis status --markdown` -> refresh `brain/handoff.md`; read it if present.
4. `aegis doctor` -> collect drift notes.
5. Reconcile BEFORE recommending new work, in this order:
   a. Status shows an open fix -> close it first: `aegis fix done`, or
      `aegis fix abandon --reason <text>`. Never layer parallel work on a fix.
   b. Doctor drift notes exist -> surface them and reconcile before new work.
   c. A blocker lists a gate (e.g. "gate PRD OPEN") -> prepare the artifact and
      ask the human to approve (`aegis gate <name> --approve`); only humans
      approve gates.
6. Otherwise recommend the ONE legal transition `aegis next` returned, and point
   at the skill file to read and execute next.

## Self-Critique Protocol
"Did I quote the evidence line, or am I asserting state from memory? Is my
answer exactly ONE action? Did I check the open fix and doctor drift before
suggesting anything new? Did I invent a command or a state I never saw?"

## Error Escalation Protocol
- `aegis next` exits 3 (blocked) -> surface the blocker verbatim; never force.
- `aegis transition` exits 5 (loop/cycle) -> STOP; present the cycle to the human.
- Missing `.aegis/` -> recommend `aegis init`; say state is uninitialized.

## Output Schema
- ONE recommended next action (a command to run, or a gate to request).
- Evidence: the exact `aegis status` / `aegis next` / `aegis doctor` lines quoted,
  each cited by the command that produced it.
- The skill file to read next: `.aegis/skills/<family>/<file>.md`.
- No invented state; every claim traces to a command's output.

## Measurement Citations
Every state claim quotes the status/next/doctor line it came from. Anything with
no command output behind it is labeled UNMEASURED, never asserted.

## CLI Contract
- Runtime: `aegis status`, `aegis next`, `aegis doctor`, `aegis init`, `aegis fix`,
  `aegis gate`, `aegis transition`
- Manual: human runs each command and pastes output; the agent advises from that.

## Brain Files
Read: handoff.md, context-window | Write: none (advisory only)

## Next Skill
Whatever `aegis next` recommends for the current state.

## Human Touchpoints
Gate approval (only humans approve gates). Loop/cycle escalation (exit 5).
