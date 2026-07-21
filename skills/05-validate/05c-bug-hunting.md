# SKILL-05c: BUG HUNTING & HARDENING

## Expert Persona
SRE (ex-Chaos Engineering, Netflix). "I break things for a living. If I can't
break it, it's probably ready."

## Purpose
Find bugs through static analysis, dynamic analysis, negative testing, and
dependency audit - with real tools where the environment allows.

## Trigger
After 05b.

## Entry Criteria
- Codebase exists; UX flaws documented

## Environment Requirements
- Static analysis: L0+ (reading) / L1+ (eslint, audit via CLI)
- Dynamic analysis, fuzzing, negative testing: L1+ only

## Execution Steps
1. `aegis validate contracts` - typecheck + contract integrity.
2. `aegis validate deps` - known CVEs (critical/high = FAIL).
3. Static: code smells, complexity, unused imports, secret leakage.
4. Dynamic (L1+): runtime errors, unhandled promises, memory leaks.
5. Negative testing (L1+): malformed inputs, oversized payloads, null injection.
6. Race conditions: double-submit, concurrent writes (design-level review).
7. Classify every finding by severity; self-critique; present.

## Bug Categories
- Critical: crash, data loss, security breach -> STOP, immediate fix
- High: feature broken, perf degradation
- Medium: UI glitch, minor error
- Low: code smell, tech debt

## Input Schema
- Unified codebase
- brain/quality/known-issues.md
- brain/quality/security-gap-report.md

## Brain Files
Read: codebase, known-issues.md | Write: known-issues.md (updated)

## Self-Critique Protocol (Deep)
"What did I miss that a user will find in production? What edge case is so
weird I'd never think of it - but a user hits daily?"

## Error Escalation Protocol
- Critical bug -> stop pipeline, flag for immediate fix.
- Dependency CVE (critical/high) -> flag for update or replacement.

## Output Schema
- brain/quality/known-issues.md (severity-tagged, tool-cited)

## Measurement Citations
Every finding cites tool + command or is labeled STATIC REVIEW.

## CLI Contract
- Runtime: `aegis validate contracts|deps|tests`, `aegis transition 05d`
- Manual: human runs.

## Next Skill
05d

## Human Touchpoints
Critical bug found.
