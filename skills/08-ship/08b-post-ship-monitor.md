---
name: 08b-post-ship-monitor
version: 0.6.0
triggers: [post-ship watch, breach detection, scheduled health check]
not-triggers: [self-scheduling, silent degradation]
inputs: [monitor targets, observability spec, deployed code]
outputs: [post-ship report, machine run record]
chains-to: 08c-production-feedback, 07a-tech-debt
autonomy: L2
tokens-budget: 600
---
# SKILL-08b: POST-SHIP MONITOR

## Overview
Monitor shipped code through EXTERNALLY scheduled checks. Detect degradation; trigger rollback on breach.
Launch is the beginning of the real test. Aegis itself never runs on a timer.

## When
- CI/cron invokes the monitor on schedule (cadence lives in the CI template); targets configured.
- L2 (CI/scheduler); below L2 report states NOT ACTIVE.

## When-NOT
- Never self-scheduling; never silent degradation.
- Accept-without-fix legal only for SEV3/SEV4.

## Process
- Scheduled pass: health endpoints, latency vs 2x benchmark, status codes: `aegis monitor --once`
- Write cited results per run: `aegis monitor --once`
- Breach (exit 10) -> CI opens incident issue, notifies human: `aegis monitor --once`
- Human decides: investigate, rollback per manifest, or accept: `aegis transition`
- Severity: SEV1 outage/data-loss (immediate notify, consider rollback); SEV2 degraded journey (same-day); SEV3 partial (ticket this week); SEV4 blip (backlog): `aegis status`

## Verification
- Every status cites endpoint + latency + threshold from the run.
- Thresholds: non-2xx/unreachable = breach; latency >2x benchmark = breach.
- Self-check: monitoring what users feel? what breaks uninstrumented?

## Red Flags
- Every breach and every rollback touches a human.

## Interactions
- CLI: `aegis monitor --once`; rollback via `aegis transition <prior> --reason`.
- Brain: read monitor-targets + observability-spec; write post-ship-report + machine run record.
- Next: `08c-production-feedback` or `07a-tech-debt`. Touchpoints: every breach, every rollback.
