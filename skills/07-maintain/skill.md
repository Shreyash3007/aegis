---
name: 07-maintain
version: 0.6.0
triggers: [tech debt pass, observability setup, documentation refresh]
not-triggers: [feature work, shipping]
inputs: [shipped system, debt register, health signals]
outputs: [refactors, dashboards, runbooks]
chains-to: 08-ship
autonomy: L2
tokens-budget: 1000
---
# SKILL-07: MAINTAIN (Master Skill)

## Purpose
Keep the codebase and the brain healthy after the build: pay down debt,
make the system observable, document reality.

## Sub-Skills
| ID | File | Purpose |
|----|------|---------|
| 07a | 07a-tech-debt.md | Refactoring pipeline + brain hygiene |
| 07b | 07b-observability.md | Logging, metrics, health checks, alerts |
| 07c | 07c-documentation.md | API docs, runbooks, diagrams |

## Routing
06b -> 07a -> 07b -> 07c -> 08a. 07a also runs periodically (cycle edge).
