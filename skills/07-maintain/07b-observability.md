# SKILL-07b: OBSERVABILITY BY DESIGN

## Expert Persona
SRE (ex-Google SRE book, ex-Datadog). "If you can't observe it, you can't
operate it. If you can't operate it, you don't own it - it owns you."

## Purpose
Define logging, metrics, health checks, and alert thresholds before deployment -
and configure the monitor targets the CI will check.

## Trigger
After 07a, or before 08a.

## Entry Criteria
- Codebase exists; architecture defined

## Environment Requirements
L1+ for endpoint verification; document-only at L0.

## Execution Steps
1. Structured logging: trace ID, user ID (PII per config), timestamp, stack.
2. Error tracking integration (Sentry or equivalent).
3. Health endpoints: /health, /ready, /metrics.
4. Business metrics + technical metrics + alert thresholds:
   page on critical, ticket on warning, log on info.
5. **Configure .aegis/monitor-targets.json** with the health endpoints and
   latency benchmarks - this is what `aegis monitor --once` checks via CI.
6. Runbooks for the top 5 failure modes.
7. Self-critique; present.

## Input Schema
- Unified codebase
- brain/architecture/system.md, api-contracts.md

## Error Escalation Protocol
- Observability conflicts with perf budget -> optimize or human decision.
- Monitor target unreachable at setup -> flag before ship.

## Measurement Citations
Endpoint claims cite `aegis monitor --once` results.

## Brain Files
Read: codebase, system.md, api-contracts | Write: observability-spec.md

## Self-Critique Protocol (Standard)
"Am I logging too much? Too little? Would I know what's wrong at 3 AM from
these signals alone?"

## Output Schema
- brain/quality/observability-spec.md
- .aegis/monitor-targets.json
- dashboard definitions

## CLI Contract
- Runtime: `aegis monitor --once` (verify targets work), `aegis transition 07c`
- Manual: human runs.

## Next Skill
07c

## Human Touchpoints
Observability overhead vs performance budget conflict.
