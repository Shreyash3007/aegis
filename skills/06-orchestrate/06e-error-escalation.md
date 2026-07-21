# SKILL-06e: ERROR ESCALATION & RECOVERY

## Expert Persona
Incident Commander (ex-PagerDuty, ex-Amazon). "When things break, you don't
panic. You follow the protocol. You preserve state. You escalate with context."

## Purpose
Handle every failure in the pipeline: classify, retry, rollback, selectively
rebuild, or escalate - with full context preserved.

## Trigger
Any skill failure (machine edges: 04a/04b/04c/05c -> 06e on structural error),
checkpoint corruption, unresolvable conflict, exit 5/6.

## Entry Criteria
- Error detected; current state readable via `aegis status`

## Environment Requirements
Any. Selective rollback requires L1+ (ast diff).

## Execution Steps
1. Classify the error:
   - Transient (timeout, rate limit) -> retry, max 2
   - Structural (arch flaw, circular dep, contract violation) -> rollback
   - Ambiguous (multiple valid paths) -> human decides
   - Critical (data loss, breach, integrity mismatch exit 6) -> STOP,
     preserve state, alert human with full context
2. Rollback: `aegis transition <target> --reason "<what and why>"`.
3. Selective rebuild (structural, slice-scoped):
   a. `aegis ast diff` -> which modules changed, which slices depend on them
   b. Preserve slices NOT in the affected set
   c. Rebuild the failed slice + dependents
   d. `aegis merge check` each rebuilt branch; full oracle re-validation
4. Log everything to brain/quality/error-log.md with the exit code.

## Escalation Protocol
Step 1: self-retry (max 2) -> Step 2: skill-specific rollback ->
Step 3: conductor reroute (skip/defer/alternate) ->
Step 4: human with full context + recommended action.
After human review of an exit-5 loop/cycle: `aegis loops reset --reason "<why>"`.

## Input Schema
- Error details + exit code
- `aegis status` output
- Latest checkpoint

## Error Escalation Protocol
This skill IS the escalation protocol - see Execution Steps. Its own failure -> human immediately.

## Brain Files
Read: state, checkpoint | Write: error-log.md, known-issues.md

## Self-Critique Protocol (Standard)
"Did I classify correctly, or did I retry a structural error twice? Is the
human getting enough context to decide in one read?"

## Output Schema
- brain/quality/error-log.md (classification, action, outcome, exit codes)
- Updated known-issues.md

## Measurement Citations
Every error entry cites the failing command + exit code.

## CLI Contract
- Runtime: `aegis status`, `aegis transition --reason`, `aegis ast diff`, `aegis merge check`, `aegis resume`
- Manual: human runs.

## Next Skill
Depends on classification: retry target / rollback target (machine edge:
06e -> 04a, `--reason` required) / human.

## Human Touchpoints
Ambiguous and critical errors. All exit-5 and exit-6 events.
