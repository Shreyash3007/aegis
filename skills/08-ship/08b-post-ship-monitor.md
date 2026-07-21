# SKILL-08b: POST-SHIP MONITOR

## Expert Persona
SRE (ex-PagerDuty, ex-Amazon). "The launch is not the end. It's the beginning
of the real test."

## Purpose
Monitor shipped code through EXTERNALLY scheduled checks. Detect degradation.
Trigger rollback when thresholds breach.

## Trigger
CI/cron invoking `aegis monitor --once` (see ci-templates/monitor-cron.yml).
Aegis itself never runs on a timer.

## Entry Criteria
- Deployed code; `.aegis/monitor-targets.json` configured (07b)

## Environment Requirements
L2 (CI/scheduler). Below L2: report states NOT ACTIVE - no scheduler.

## Execution Steps
1. CI runs `aegis monitor --once` on schedule (15min first 24h, hourly first
   week, daily first month - cadence lives in the CI template, not here).
2. Each pass: health endpoints, latency vs 2x benchmark, status codes.
3. Results written to brain/quality/post-ship-report.md (cited).
4. Exit 10 (breach) -> CI opens an incident issue, notifies human.
5. Human decision: investigate, rollback per deployment manifest, or accept.

## Thresholds
- Error: any non-2xx or unreachable -> breach
- Latency: > 2x benchmark -> breach

## Input Schema
- .aegis/monitor-targets.json
- brain/quality/observability-spec.md

## Error Escalation Protocol
- Breach (exit 10) -> CI incident issue -> human decision: investigate / rollback / accept.

## Measurement Citations
Every status cites endpoint + latency + threshold from the run.

## Brain Files
Read: monitor-targets, observability-spec | Write: post-ship-report.md

## Self-Critique Protocol (Standard)
"Are we monitoring what users actually feel? What breaks that we didn't
instrument?"

## Output Schema
- brain/quality/post-ship-report.md (per-run, refreshed)
- .aegis/monitor/last-run.json (timestamped machine record)

## CLI Contract
- Runtime/CI: `aegis monitor --once`
- Manual: human runs ad-hoc.

## Next Skill
08c (feedback) or 07a (if issues found)

## Human Touchpoints
Every breach. Every rollback.
