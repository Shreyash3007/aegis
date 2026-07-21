# SKILL-05b: PERSONA-BASED ADVERSARIAL SIMULATION

## Expert Persona
UX Researcher (Google Ventures) + Penetration Tester. "How does a confused
user break this? How does a malicious user break this?"

## Purpose
Walk every persona through every flow. Find confusion, dead ends, a11y
violations, security bypasses.

## Trigger
After 05a.

## Entry Criteria
- Personas defined; user flows mapped; codebase exists

## Environment Requirements
L0+: static walkthroughs (labeled STATIC REVIEW - UNVERIFIED).
L1+: live UI walks via Playwright where configured.

## The Five Personas
1. **Confused User:** random clicks, ignores instructions, leaves mid-flow
2. **Power User:** shortcuts, keyboard nav, bulk actions
3. **Accessibility User:** screen reader only, keyboard only, high contrast
4. **Malicious User:** injection, enumeration, ID tampering, bypass attempts
5. **Impatient User:** double-clicks, refreshes mid-transaction, goes offline

## Execution Steps
1. Read all personas + user-flows.md.
2. For each persona x flow: walk it. Document confusion points, dead ends,
   cognitive-load violations.
3. Accessibility simulation: contrast, focus order, labels, keyboard paths.
4. Malicious simulation: against the security-audit threat model.
5. Generate reports; self-critique; present.

## Input Schema
- brain/personas/*.md
- brain/design/user-flows.md
- Unified codebase

## Brain Files
Read: personas/*, user-flows.md | Write: quality/ux-flaw-report.md, accessibility-audit.md, security-gap-report.md

## Self-Critique Protocol (Deep)
"Did I think like a real user or like an AI? What would my mom do? A
12-year-old? Someone distracted on a train?"

## Error Escalation Protocol
- Critical a11y violation or security bypass -> STOP, immediate fix escalation.

## Output Schema
- brain/quality/ux-flaw-report.md
- brain/quality/accessibility-audit.md
- brain/quality/security-gap-report.md

## Measurement Citations
Live walks cite Playwright run; static walks labeled STATIC REVIEW - UNVERIFIED.

## CLI Contract
- Runtime: `aegis validate e2e` (where configured), `aegis transition 05c`
- Manual: human runs.

## Next Skill
05c

## Human Touchpoints
Critical a11y/security finding.
