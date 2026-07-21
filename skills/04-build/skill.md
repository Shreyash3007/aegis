# SKILL-04: BUILD (Master Skill)

## Purpose
Build the planned slices - in parallel where the platform allows - with
correctness enforced by git and the compiler, never by LLM opinion.

## Sub-Skills
| ID | File | Purpose |
|----|------|---------|
| 04a | 04a-parallel-build.md | Team composition + slice spawning in worktrees |
| 04b | 04b-integration-orchestrator.md | DAG-ordered merges through the oracle |
| 04c | 04c-integration.md | Contract validation, migrations, integration tests |

## The Five Non-Negotiables (CLI-enforced)
| # | Rule | Enforcement |
|---|------|-------------|
| N1 | Contract PR merges before any agent spawns | `aegis transition 04a` refuses |
| N2 | Worktree-per-slice, always | `aegis slice create` (outside repo, A1.5) |
| N3 | Merge oracle = real merge + tsc + contract diff | `aegis merge check` exit 9 |
| N4 | Platform capabilities verified with evidence | Appendix C matrix |
| N5 | Lane caps are the only swarm throttle | `aegis slice create` refuses at cap |

## Routing
03b -> [N1] -> 04a -> 04b -> 04c -> [SACRED G3] -> 05a
