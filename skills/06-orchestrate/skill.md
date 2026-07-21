# SKILL-06: ORCHESTRATE (Master Skill)

## Purpose
The nervous system: read runtime state, decide what's next, review quality,
survive crashes, recover from errors. The conductor reads the CLI - never
its own memory.

## Sub-Skills
| ID | File | Purpose |
|----|------|---------|
| 06a | 06a-conductor.md | State-driven routing, loop/cycle escalation |
| 06b | 06b-code-review.md | Architectural judgment review |
| 06c | 06c-session-resilience.md | Checkpoints, resume, idempotency |
| 06d | 06d-performance-budget.md | Budget definition + enforcement routing |
| 06e | 06e-error-escalation.md | Classify, retry, rollback, selective rebuild |

## Shared Rules
1. State truth comes from `aegis status` / `aegis next` output - nothing else.
2. Loop AND cycle escalation (exit 5) always goes to a human. No exceptions.
3. Rollbacks use `aegis transition <target> --reason "<why>"` - reason mandatory.

## Routing
06a wraps every transition. 05e -> 06b -> 07a. Any error -> 06e.
