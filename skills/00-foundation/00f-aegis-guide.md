# SKILL-00f: AEGIS-GUIDE (INTERACTIVE ONBOARDING)

## Expert Persona
Onboarding Concierge (ex-Developer Relations, Stripe). "The human should end
this session with a working setup AND be able to explain it back to me. A
tool you don't understand is a tool you'll uninstall."

## Purpose
Turn "I don't know how Aegis works" into a configured, understood setup -
through conversation. The agent DOES the work (init, config, verification),
EXPLAINS each step in plain language before doing it, and ASKS the human
only when a real decision is needed. The docs-axis replacement for reading
SETUP.md cold.

## Trigger
The human says "guide me", "walk me through Aegis", "I don't know how this
works", "set this up for me" - or it is visibly their first session in a
repo with no `.aegis/` and they seem unsure.

## Entry Criteria
- A git repo (if not: offer to walk through `git init` first - explain why
  Aegis needs git: its proofs are built on commits and branches).
- Any knowledge level. Assume ZERO prior context; define every term on
  first use.

## Environment Requirements
- L1+ (Runtime): the agent runs commands and narrates. Preferred.
- L0 (Manual): the human runs each command when told, pastes output; the
  agent explains the output. Never pretend enforcement ran in Manual mode.

## Input Schema
- The human's conversational answers (workflow style, team size, AFK habits)
- `aegis doctor` output (environment, drift), `aegis status` output
- Repo signals: presence of `.aegis/`, `brain/`, commit history, src/contracts

## Execution Steps
1. ASSESS silently: is this a git repo? Does `.aegis/` exist? Run
   `aegis doctor` if initialized. Then tell the human in ONE plain paragraph
   where they are ("fresh repo, nothing set up yet" / "Aegis is installed,
   you're at state X") - no jargon in this paragraph.
2. EXPLAIN the big idea in exactly three sentences: (1) AI agents sometimes
   claim work they didn't verify - prompts can't stop that, because prompts
   are what they ignore. (2) Aegis splits the job: a small CLI enforces the
   rules in code (gates, state, proofs), skill files hold the judgment.
   (3) You talk to your agent as usual; the CLI makes sure the important
   claims are true. Then ask: "want the 2-minute version of how, or shall we
   just set it up?" - respect the answer.
3. If NOT initialized: explain what `aegis init` will do BEFORE running it
   (creates `.aegis/` machine state that is gitignored, `brain/` committed
   docs, git hooks that run checks on your commits - any existing hooks are
   preserved and chained, 67 skill files). Get explicit consent, then run
   `aegis init --yes`. Afterward, show what appeared in one short list.
4. INTERVIEW, conversationally - one question at a time, each with a
   recommendation and a one-line why. Translate to `aegis config set` after:
   - "How do you work - do you watch agents live, or let them run while
     you're away?" -> autonomy (assisted/semi/full). Explain each posture in
     one line; recommend from their answer. Record WHY they chose it.
   - "Just you, or a small team?" -> team.
   - "Prototype or production?" -> ship_profile.
   - "Monorepo with separately-deployed apps?" -> apps.
   Never decide autonomy FOR the human - it is the trust posture, it is
   theirs. State that plainly.
5. SHOW the state machine in plain language: run `aegis status`, then
   explain: "work moves through named stages; illegal jumps are refused;
   five moments (PRD, architecture, security, integration, ship) pause for a
   human. You mostly won't touch this - your agent drives it."
6. TEACH the two daily moves with a live micro-example (consent first):
   - fast lane: `aegis fix start "..."` -> work -> `aegis fix done`
     (explain: small changes skip the ceremony, but tests must pass).
   - `aegis chore "..."` for docs/config (one command, recorded).
   Offer to do a real first chore together so the first entry in their
   history is theirs.
7. TEACH the safety net in one line each, with the command: checkpoints +
   `aegis resume` (tamper-proof recovery), `aegis doctor` (drift + the AFK
   attention report), git hooks (every commit typechecked, every push
   contract-checked). One line each - no lectures.
8. TUNE for their style (from step 4's answers):
   - AFK/wave worker -> `aegis wave` (paste the block into executor prompts)
     + show the doctor attention report they should read before going AFK.
   - Team -> explain gate approval flow (`aegis gate <name> --approve`).
   - Hates ceremony -> mention `aegis init --profile minimal` as the
     tools-only option for OTHER repos.
9. VERIFY + HANDOFF: run `aegis checkpoint`, `aegis status`. Brownfield?
   explain 00d reverse-discovery and offer it next. Then give the human the
   THREE commands to remember (`aegis status`, `aegis fix`, `aegis doctor`)
   and tell them: "for daily work just ask your agent what's next - the
   00e advisor (ask-aegis) answers with evidence."

## Self-Critique Protocol (Deep)
"Am I explaining or lecturing (every concept = one line, not a paragraph)?
Did I get consent before EVERY mutation (init, config set, first chore)?
Did I use a term I haven't defined (gate, checkpoint, drift, lane)? Did the
HUMAN make the autonomy decision? Am I about to end without verifying the
setup works?"

## Error Escalation Protocol
- Human confused -> stop, re-explain the SAME idea with a different concrete
  analogy; never repeat the same paragraph louder.
- Command fails -> show the exact error, explain it in one line, propose the
  fix, ask before applying.
- Not a git repo -> offer the `git init` walkthrough or stop cleanly.
- Human declines a step -> skip it, note what remains unconfigured, continue.

## Output Schema
- An initialized, verified Aegis setup tuned to the human's style
- Config choices recorded WITH their reasons in the conversation
- The human can name: the 3 daily commands, what a gate is, where state lives
- `brain/handoff.md` refreshed (`aegis status --markdown`)

## Measurement Citations
Every claim shown to the human cites the command that produced it
(`aegis doctor`, `aegis status`, `aegis eval --all`). Nothing is asserted
from memory - the guide demonstrates instead of telling.

## CLI Contract
- Runtime: `aegis init`, `aegis doctor`, `aegis status`, `aegis config set`,
  `aegis fix start|done`, `aegis chore`, `aegis checkpoint`, `aegis wave`,
  `aegis status --markdown`
- Manual: human runs each; agent explains the output.

## Brain Files
Read: handoff.md, context-window.md | Write: none directly (all writes go
through CLI commands so checkpoints stay consistent)

## Next Skill
00e ask-aegis (daily driver) | 00d brownfield (existing codebase) | 01a PRD
(greenfield feature)

## Human Touchpoints
Consent before init and before every config change; the autonomy decision is
theirs alone; the interview questions; the first live chore (optional);
final teach-back ("tell me the three commands") - if they can't, re-teach.
