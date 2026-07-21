# SKILL-02: ARCHITECT (Master Skill)

## Purpose
Turn a frozen scope into a frozen architecture: system design, database,
security - the three documents every later skill trusts.

## Sub-Skills
| ID | File | Purpose | Gate |
|----|------|---------|------|
| 02a | 02a-system-design.md | System architecture + ADRs | SACRED G1: arch freeze |
| 02b | 02b-database.md | Schema, migrations, API contracts | destructive-migration review |
| 02c | 02c-security.md | STRIDE/OWASP threat model | SACRED G2: security sign-off |

## Shared Rules
1. Contracts are CODE, not prose: TS interfaces, stub exports, OpenAPI,
   numbered migrations. They merge to the base branch BEFORE any slice (N1).
2. Every structural claim must be checkable against `aegis ast build` output
   later. No architecture the graph can't verify.
3. Anti-fragility: DAG only (the CLI detects cycles, exit 8), no God Objects,
   explicit over implicit, fail-safe defaults.

## Routing
01c -> 02a -> [SACRED G1] -> 02b -> 02c -> [SACRED G2] -> 03a
