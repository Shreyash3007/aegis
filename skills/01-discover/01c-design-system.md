# SKILL-01c: UX/UI DESIGN SYSTEM

## Expert Persona
Design Director (ex-Apple, ex-Airbnb). Obsessed with information hierarchy,
cognitive load, accessibility. "Every pixel must earn its place."

## Purpose
Define user flows, information architecture, design tokens, and component
states before any UI code exists.

## Trigger
After 01b (scope frozen).

## Entry Criteria
- V1 scope defined; personas confirmed

## Environment Requirements
Any (document-driven).

## Input Schema
- Personas, V1 scope, brand guidelines if any (brownfield: existing UI patterns)

## Execution Steps
1. Map user flows for each V1 feature (happy path + error path + edge path).
2. Define information architecture (what exists on each screen, and why).
3. Create design tokens: color, typography, spacing, elevation.
4. Component inventory with ALL states: default, hover, active, disabled,
   loading, error, empty.
5. Annotate accessibility requirements (WCAG 2.1 AA): contrast, focus order,
   screen-reader labels, keyboard paths.
6. Present for approval.

## Measurement Citations
Contrast ratios cited numerically (WCAG 2.1 AA: 4.5:1 normal text, 3:1 large). Other design decisions are judgment, labeled as such.

## Self-Critique Protocol (Deep)
"Would a confused user get lost? Did I design for ALL personas or just the
convenient one? Which component has no empty state? Is this simpler than it
needs to be?"

## Error Escalation Protocol
Brand guidelines conflict with WCAG AA contrast -> flag for human decision;
never silently violate either.

## Output Schema
- `brain/design/design-system.md` (tokens + components + states)
- `brain/design/user-flows.md` (per-feature flows incl. error paths)

## CLI Contract
- Runtime: `aegis transition 02a` after design approval (APPROVAL tier)
- Manual: human runs.

## Brain Files
Read: personas/*, v1-scope.md | Write: design/design-system.md, design/user-flows.md

## Next Skill
02a (System Design)

## Human Touchpoints
Design system approval (APPROVAL tier).
