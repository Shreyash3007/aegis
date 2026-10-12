---
name: 05c-bug-hunting
version: 0.6.0
triggers: [static bug sweep, dynamic hardening, flaky quarantine]
not-triggers: [silent retries, unverified tool claims]
inputs: [codebase, known issues, security gap report]
outputs: [severity-tagged findings, quarantined flakies]
chains-to: 05d-e2e-performance
autonomy: L1
tokens-budget: 1000
---
# SKILL-05c: BUG HUNTING & HARDENING

## Overview
Find bugs through static analysis, dynamic analysis, negative testing, and dependency audit.
Break things for a living; what survives is probably ready.

## When
- After 05b; codebase exists, UX flaws documented.
- Static L0+; dynamic/fuzz/negative testing L1+ only.

## When-NOT
- Never silently retry a flaky test until it passes — quarantine, ticket, link.
- Retry budget max 2 reruns; still failing = real failure, classified and fixed.

## Process
- Typecheck + contract integrity: `aegis validate contracts`
- Known CVEs via audit (critical/high = FAIL): `aegis validate deps`
- Static sweep (smells, complexity, unused imports, secret leakage): `aegis validate`
- Dynamic (L1+): runtime errors, unhandled promises, memory leaks: `aegis validate tests`
- Negative testing (L1+): malformed inputs, oversized payloads, null injection: `aegis validate tests`
- Race review (double-submit, concurrent writes, design level): `aegis validate tests`
- Classify every finding (Critical/High/Medium/Low); quarantine flakies with rate + ticket; advance: `aegis transition 05d`

## Verification
- Every finding cites tool + command or is labeled STATIC REVIEW.
- Flaky entries carry rate, first-seen, suspected cause, ticket link.
- Critical = crash/data-loss/breach -> STOP, immediate fix.

## Red Flags
- Critical bug -> stop pipeline, immediate fix flag.
- Dependency CVE (critical/high) -> update or replace flag.

## Interactions
- CLI: `aegis validate contracts|deps|tests`, `aegis transition 05d`.
- Brain: read codebase + known-issues; write updated known-issues.
- Next: `05d-e2e-performance`. Touchpoint: critical bug found.
