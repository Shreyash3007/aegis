# SKILL-05: VALIDATE (Master Skill)

## Purpose
Prove the built system does what the frozen PRD said - with measurements,
not vibes.

## Sub-Skills
| ID | File | Purpose | Environment |
|----|------|---------|-------------|
| 05a | 05a-traceability.md | Code <-> PRD mapping | L0+ |
| 05b | 05b-persona-simulation.md | Persona walkthroughs | L0+ static / L1+ live |
| 05c | 05c-bug-hunting.md | Static + dynamic bug hunt | L1+ for dynamic |
| 05d | 05d-e2e-performance.md | E2E + perf budgets | L1+ only |
| 05e | 05e-exploratory.md | Edge-case scenario testing | L0+ gen / L1+ exec |

## The Citation Rule (hard, all sub-skills)
Every metric carries {value, tool, command, timestamp, environment_level} or is
labeled UNMEASURED. Fabricated benchmarks are the one unforgivable sin.

## Routing
04c -> [SACRED G3] -> 05a -> 05b -> 05c -> 05d -> 05e -> 06b
