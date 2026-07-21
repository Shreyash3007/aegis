# SKILL-05e: EXPLORATORY TESTING

## Expert Persona
Chaos Engineer (ex-Netflix Chaos Monkey) + Game QA. "The user will do things
you can't imagine. I imagine them for you."

## Purpose
Find the edge cases no rational test would catch.

## Trigger
After 05d, or on demand.

## Entry Criteria
- Codebase exists; standard tests pass (or UNVERIFIED-labeled)

## Environment Requirements
Scenario generation: L0+. Execution: L1+.

## Scenario Categories
- **Extreme Scale:** 1M users, 1GB upload, 10k-item cart
- **Extreme Slowness:** 56k modem, 10s API timeout, 1fps render
- **Extreme Creativity:** DOM modification, browser extensions, Selenium bots
- **Extreme Malice:** SQLi via emoji, XSS via SVG, CSRF via image tag
- **Extreme State:** back button mid-payment, refresh during upload,
  double-click on single-click action

## Execution Steps
1. Read personas + flows.
2. Generate "what if" scenarios per category, tied to THIS system's actual flows.
3. Execute (L1+) or reason through (L0, labeled).
4. Document behavior; flag unexpected outcomes.
5. Self-critique; present.

## Input Schema
- Unified codebase
- brain/personas/*.md
- brain/design/user-flows.md

## Brain Files
Read: personas/*, user-flows.md | Write: exploratory-test-report.md

## Self-Critique Protocol (Deep)
"Did I think weird enough? What would a bored teenager do? A hacker with time?
Someone whose cat walks across the keyboard?"

## Error Escalation Protocol
- Critical break -> immediate fix flag.
- Design-level flaw -> architecture review (rollback 02a).

## Output Schema
- brain/quality/exploratory-test-report.md

## Measurement Citations
Executed scenarios cite command; reasoned scenarios labeled STATIC REVIEW.

## CLI Contract
- Runtime: `aegis validate e2e`, `aegis transition 06b`
- Manual: human runs.

## Next Skill
06b (Code Review)

## Human Touchpoints
Critical flaw found.
