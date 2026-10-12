---
name: 07b-observability
version: 0.6.0
triggers: [sli slo definition, health endpoints, monitor targets]
not-triggers: [unobservable shipping, secret-bearing logs]
inputs: [codebase, system design, api contracts]
outputs: [observability spec, monitor targets, dashboards]
chains-to: 07c-documentation
autonomy: L2
tokens-budget: 800
---
# SKILL-07b: OBSERVABILITY BY DESIGN

## Overview
Define logging, metrics, health checks, and alert thresholds before deployment — and configure the monitor targets CI will check.
Unobservable systems own you, not the reverse.

## When
- After 07a, or before 08a; architecture defined.
- L1+ for endpoint verification; document-only at L0.

## When-NOT
- Never log secrets or PII beyond config; never ship targets unverified.

## Process
- Structured logging (trace ID, user ID per PII config, timestamp, stack) + error tracking integration: `aegis status`
- Health endpoints (/health, /ready, /metrics): `aegis monitor --once`
- Per-journey 2-4 SLIs (availability, p95 latency, correctness, freshness) with one SLO target each; burn-rate -> alert tier (fast burn pages, slow burn tickets, in-budget logs): `aegis monitor --once`
- Write monitor targets (endpoints + latency benchmarks) for CI checks: `aegis monitor --once`
- Runbooks for top-5 failure modes; self-critique; present; advance: `aegis transition 07c`

## Verification
- Endpoint claims cite monitor-run results.
- SLO example budgets: 99.9% = 43 min/month; 99.95% = 22 min/month.
- Self-check: too much/too little logging? 3-AM-diagnosable from these signals alone?

## Red Flags
- Observability vs perf-budget conflict -> optimize or human decision.
- Monitor target unreachable at setup -> flag before ship.

## Interactions
- CLI: `aegis monitor --once`, `aegis transition 07c`.
- Brain: read codebase, system, api-contracts; write observability-spec, monitor targets, dashboards.
- Next: `07c-documentation`. Touchpoint: overhead-vs-budget conflict.
