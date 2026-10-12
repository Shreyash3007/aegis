---
name: 01c-design-system
version: 0.6.0
triggers: [design tokens, user flows, component states]
not-triggers: [ui code, silent a11y violations]
inputs: [personas, v1 scope, brand guidelines]
outputs: [design-system.md, user-flows.md]
chains-to: 02a-system-design
autonomy: L1
tokens-budget: 800
---
# SKILL-01c: UX/UI DESIGN SYSTEM

## Overview
Define user flows, information architecture, design tokens, and component states before any UI code exists.
Every pixel must earn its place.

## When
- After 01b, scope frozen; V1 scope defined, personas confirmed.
- Document-driven; any environment.

## When-NOT
- Never design for the convenient persona only; never ship a component without an empty state.
- Brand-vs-WCAG conflicts are flagged, never silently resolved either way.

## Process
- Map user flows per V1 feature (happy + error + edge paths): `aegis status`
- Define information architecture (what lives on each screen, and why): `aegis status`
- Create design tokens (color, typography, spacing, elevation): `aegis status`
- Inventory components with ALL states (default, hover, active, disabled, loading, error, empty): `aegis status`
- Annotate a11y (WCAG 2.1 AA: 4.5:1 normal, 3:1 large; focus order; SR labels; keyboard paths), ratios cited numerically: `aegis status`
- Present for design approval (APPROVAL tier), then advance: `aegis transition 02a`

## Verification
- Contrast ratios numeric; other design decisions labeled judgment.
- Self-check: lost confused user? all personas covered? component missing empty state? simpler than it needs to be?

## Red Flags
- Brand guidelines vs WCAG AA contrast -> human decides.
- PRD contradiction -> `aegis transition 01a --reason "<contradiction>"`.

## Interactions
- CLI: `aegis transition 02a` after design approval.
- Brain: read `personas/*`, `v1-scope.md`; write `design/design-system.md`, `design/user-flows.md`.
- Next: `02a-system-design`. Touchpoint: design approval.
