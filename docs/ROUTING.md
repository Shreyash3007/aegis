# Blade Routing (v0.6.0-draft)

How the 3,057 global skills fit inside Aegis without becoming a second orchestrator.

## Law

Aegis does not import skills. It **routes** them as *blades*:

1. No agent invokes an external blade directly. No agent talks to another agent.
2. Each Aegis phase lists its allowed blades (`skills/routing.json`, machine truth).
3. The lane worker runs the blade inside an `aegis exec` recorded run.
4. Blade output returns to the phase gate with evidence (`file:line`/tool output) or is stamped `INFERRED`/`UNMEASURED`/`BLOCKED`.
5. Trigger collisions fail `aegis lint-skills`. One concept per blade; link, never copy.

## Thin vs thick

- **Thin chain** (flow): ordered steps, cheap, no gate power. Research, diagrams, execution evidence.
- **Thick gate** (rigor): binary verdict, evidence-attached, can refuse the lane. Debug, TDD, verify, lint, e2e, design review, UI gate, Jev judges.

## Phase map

| Phase | Blades |
|---|---|
| 01-discover | agent-reach, last30days, deep-research, research-ops |
| 02-architect | archify, gitnexus-exploring |
| 04-build | terminal-ops (+ aegis-native) |
| 05-validate | systematic-debugging, test-driven-development, verification-loop, lint-and-validate, browser-qa, chrome-use, open-computer-use, brooks-lint, unslop, humanizer, tastegate |
| prototype track | scroll-craft, image-use (`aegis demo record` pins the artifact; DEMO gate approval before any production lane) |
| judgment-ring (all phases) | `aegis jev judge\|triage\|score\|classify\|cite`: typed Choice/Noul/Score over direct TypeSafe HTTPS behind `TYPESAFE_API_KEY` (model jev-1.13.0 verified live); no key = degraded mode that announces itself verbally. The jev-use MCP server is never required. |

## Missing blades (fallback, never block)

- `typesafe-ai` → served locally by `aegis jev` (direct TypeSafe HTTPS, zero new deps; verified live 2026-10-12). The jev-use MCP server is never required.
- `playwright` → browser-qa + chrome-use; record which backend produced the evidence.
- `anti-slop` → unslop + brooks-lint + `lint-skills` budgets/line-ratchet at merge.

## Install policy

No further global installs until the store is pruned to the allowlist and counts verified. New blades land as routing entries with status, never as bulk installs.
