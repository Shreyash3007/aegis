# SKILL-00: FOUNDATION (Master Skill)

## Purpose
Set up Aegis in any repo, lock context, recover sessions, ingest existing codebases.
Everything else in Aegis depends on this family being correct.

## Sub-Skills
| ID | File | Purpose | Human gate |
|----|------|---------|-----------|
| 00a | 00a-installer.md | One-command install, environment detection | Overwrite prompt only |
| 00b | 00b-context-lock.md | Setup interview + locked manifest | The interview itself |
| 00c | 00c-resume.md | Crash/session recovery with verified integrity | Integrity failure |
| 00d | 00d-brownfield.md | Reverse-discovery: brain FROM existing code | Inference confirmation |
| 00e | 00e-ask-aegis.md | Next-action advisor: ONE recommended step + evidence | Gate approval / loop escalation |

## Shared Rules (all sub-skills)
1. **Brain protocol:** read `brain/context-window.md` before any edit; write outputs
   to the designated brain files; state changes ONLY via the `aegis` CLI.
2. **Dual mode:** every step lists the CLI command (Runtime mode) and the manual
   fallback (human runs command, pastes output). Never pretend enforcement exists
   in Manual mode.
3. **Determinism:** never write timestamps into generated artifacts (A1.2).
4. **Honesty:** if a step cannot be performed in the current environment level,
   say so explicitly and label outputs UNVERIFIED.

## Routing
- greenfield: 00a -> 00b -> 01a
- brownfield: 00a -> 00b -> 00d -> (01a for new features | 07a for hardening)
- crash/interruption: 00c -> checkpoint target
- unsure / blocked / cold session: 00e (ask-aegis) -> the one legal next action
