---
name: 06e-error-escalation
version: 0.6.0
triggers: [failure classification, selective rebuild, escalation with context]
not-triggers: [panicking, retrying structural errors, silent drops]
inputs: [error details, status output, latest checkpoint]
outputs: [error log, updated known issues, recovery action]
chains-to: retry-or-rollback-target
autonomy: L1
tokens-budget: 800
---
# SKILL-06e: ERROR ESCALATION & RECOVERY

## Overview
Handle every failure: classify, retry, rollback, selectively rebuild, or escalate — with full context preserved.
When things break you follow the protocol, preserve state, escalate with context.

## When
- Any skill failure, checkpoint corruption, unresolvable conflict, exit 5/6; state readable.
- Selective rollback needs L1+ (graph diff).

## When-NOT
- Never retry a structural error twice; never drop context on escalation.
- This skill's own failure -> human immediately.

## Process
- Classify: transient (timeout/rate-limit) -> retry max 2; structural -> rollback; ambiguous -> human decides; critical (data loss/breach/exit-6) -> STOP, preserve, alert: `aegis status`
- Rollback with what-and-why recorded: `aegis transition`
- Selective rebuild: affected set via graph diff; preserve untouched slices; rebuild failed + dependents; oracle re-validate each: `aegis ast diff`
- Selective rebuild: affected set via graph diff; preserve untouched slices; rebuild failed + dependents; oracle re-validate each: `aegis merge check`
- Log everything with exit codes: `aegis checkpoint`
- After human review of exit-5 loops: zero counters with audited reason: `aegis loops reset --reason`

## Verification
- Every error entry cites failing command + exit code.
- Escalation ladder honored: self-retry -> skill rollback -> conductor reroute -> human with context + recommendation.
- Self-check: classified or mis-retried? human decidable in one read?

## Red Flags
- Ambiguous and critical errors, all exit-5/6 events -> human, always.

## Interactions
- CLI: `aegis status`, `aegis transition --reason`, `aegis ast diff`, `aegis merge check`, `aegis resume`.
- Brain: read state + checkpoint; write error-log, known-issues.
- Next: retry target / rollback target (06e -> 04a needs `--reason`) / human.
