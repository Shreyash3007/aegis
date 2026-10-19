# v0.11 Accessibility Audit (05b)

Header: 2026-10-18 | source `59f1f52` | target: shipped `docs/index.html`
(the recorded DEMO artifact, pinned `demo_sha 796a812aa213a6e7`) | method:
measured, not asserted.

## 1. Contrast (WCAG 2.1 AA, 4.5:1 normal text / 3:1 large text + UI)

Measured with a relative-luminance implementation over the actual CSS
variables and literals in `docs/index.html`.

| Token / pair | Ratio | Required | Result |
|---|---|---|---|
| `--ink #1f2328` on `--bg #ffffff` | 15.80 | 4.5 | PASS |
| `--muted #59636e` on `--bg #ffffff` | 6.11 | 4.5 | PASS |
| `--accent-ink #0550ae` on `--bg #ffffff` | 7.59 | 4.5 | PASS |
| `#ffffff` on `--ink #1f2328` (primary button) | 15.80 | 4.5 | PASS |
| `#1a7f37` status dot on `#ffffff` | 5.08 | 3.0 (UI) | PASS |
| `#cf222e` on `#ffffff` | 5.36 | 4.5 | PASS |
| `.term .dim #8b949e` on terminal `#0d1117` | 6.15 | 4.5 | PASS |
| `.term .ok #7ee787` on `#0d1117` | 12.32 | 4.5 | PASS |
| `.term .fail #ffa198` on `#0d1117` | 9.74 | 4.5 | PASS |
| `#8b949e` on `#ffffff` (hypothetical only) | 3.08 | 4.5 | **below** — not used on white |

The last row is a guard note, not a live defect: `.term .dim` is only
rendered inside the dark terminal panel. Recorded so a future edit that moves
the token onto white is caught by this audit.

## 2. Structure and semantics

| Check | Observed |
|---|---|
| `lang` attribute | `<html lang="en">` present |
| Document title | `<title>AEGIS - The enforcement layer for AI-native development</title>` |
| Viewport meta | `<meta name="viewport" content="width=device-width, initial-scale=1">` present |
| Heading order | single `<h1>`, then `<h2>` sections, `<h3>` inside cards |
| Images/`<svg>` | 1 occurrence, inline decorative — no missing `alt` on `<img>` (none exist) |
| Icon-only links | none — every `<a>` carries text |
| Link vs button semantics | navigation uses `<a href>`, no JS-only click handlers |

## 3. Keyboard and focus

- No `outline: none` / `outline: 0` rule exists in the stylesheet, so the
  browser focus indicator is never suppressed.
- No `tabindex` overrides, no focus traps, no modal.
- All interactive elements are native `<a href>` — reachable by Tab and
  activated by Enter without scripting.

## 4. Motion and preference

- One `transition:` declaration, zero `@keyframes`/`animation:`.
- No `prefers-reduced-motion` query. Acceptable at this size (a single
  hover-color transition, no parallax/auto-play), and recorded as a
  deliberate, revisit-if-motion-grows note rather than an omission.

## 5. Verdict

No critical or major accessibility violation. No AA failure on any pair that
actually renders. The 05b red flag ("critical a11y violation → STOP") did not
trigger.

Limits: this is a static + measured-CSS audit of one page. It is not a
screen-reader session, not a keyboard-only user test, and not an automated
axe-core run — those remain UNMEASURED and are not claimed.
