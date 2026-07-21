# SKILL-03: PLAN (Master Skill)

## Purpose
Turn frozen architecture into an executable plan: vertical slices, dependency
DAG, lane assignments, and the standards every slice obeys.

## Sub-Skills
| ID | File | Purpose |
|----|------|---------|
| 03a | 03a-execution-planning.md | Slices, DAG, lanes, merge strategy |
| 03b | 03b-standards.md | AI-navigable conventions + lint config |

## Shared Rules
1. Slices are vertical and independently shippable: UI + API + DB + tests.
2. Lane math is config-driven: min(RAM/lane_cost, human cap, provider limits).
   No token budgets - dropped (D4).
3. The dependency DAG must be checkable against `aegis ast build` output.

## Routing
02c -> [SACRED G2] -> 03a -> 03b -> [N1: contracts merged] -> 04a
