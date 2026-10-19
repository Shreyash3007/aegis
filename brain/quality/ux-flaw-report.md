# v0.11 UX Flaw Report (05b — persona walk)

Header: 2026-10-18 | source `59f1f52` | **live walks executed** in a disposable
repo (`%TEMP%\aegis-05b-walk`) against `dist/cli.js`; site claims measured
against the shipped `docs/index.html`. No static-only claims are presented as
verified.

Five personas as the skill requires: confused, power, accessibility,
malicious, impatient. Every command below was run; outputs are cited verbatim
where they matter.

## 1. Confused user (first contact, no context)

| Flow | Command | Observed | Verdict |
|---|---|---|---|
| "What is this?" | `aegis` (no args) | Full command surface + exit-code table, exit 0 | Good — teaches the model |
| "I typed it wrong" | `aegis frobnicate` | `unknown command: frobnicate` + full usage, exit 2 | Good |
| "Where am I?" | `aegis status` before init | `FAIL missing .aegis/config.json - run aegis init`, exit 2 | Good — names the fix |
| "I'll set my profile" | `aegis config set quality_profile` | **`FAIL unknown key 'quality_profile' - valid keys: … quality_profile …`** | **FLAW (fixed)** |
| "Let me just try" | `aegis config set` | **`FAIL unknown key 'undefined' …`** | **FLAW (fixed)** |

**Finding UX-1 (minor, FIXED in this cycle):** two `config set` messages lied.
A valid key without a value was reported as "unknown key" while the same
message listed it as valid; a bare `config set` printed
`unknown key 'undefined'`. Both now name the real problem
(`usage: aegis config set <key> <value>` / `config set: quality_profile needs
a value`). Evidence: `test/config.test.js` test
`config set: missing value and missing key are named honestly` — RED
(`unknown key 'quality_profile'`) → GREEN. Fast lane closed with
`validation: PASS (npm test)`, full suite 391/391.

Cognitive load otherwise good: every refusal names the next command.

## 2. Power user (automation, scripting, completion)

| Flow | Command | Observed | Verdict |
|---|---|---|---|
| Script against help | `aegis --help` | exit **0**, full surface | Good (stable contract) |
| Machine-readable position | `aegis status` | exit 0, parseable lines | Good |
| Shell completion | `aegis completions pwsh` | exit 0 | Good |
| Wrong completion shell | `aegis completions powershell` | `usage: aegis completions <bash|zsh|pwsh>`, exit 2 | Acceptable — the usage names the valid set |
| Scripted evidence | `aegis evidence export --file …` | exit 0, private-safe aggregate | Good |

**Note (not a flaw):** `completions powershell` is refused while the real
PowerShell script name is `pwsh`. The message lists the valid values
immediately, so the recovery cost is one retry. Recorded as a note, not a
finding.

## 3. Accessibility (real measurements, not assertions)

Measured from the shipped `docs/index.html` tokens with a WCAG relative
luminance calculation (script cited in §6):

| Pair | Ratio | AA normal (4.5) |
|---|---|---|
| ink `#1f2328` on bg `#ffffff` | 15.80 | PASS |
| muted `#59636e` on bg `#ffffff` | 6.11 | PASS |
| accent-ink `#0550ae` on bg `#ffffff` | 7.59 | PASS |
| white on ink button `#1f2328` | 15.80 | PASS |
| green dot `#1a7f37` on `#ffffff` | 5.08 | PASS |
| red `#cf222e` on `#ffffff` | 5.36 | PASS |
| terminal dim `#8b949e` on term `#0d1117` | 6.15 | PASS |
| terminal ok `#7ee787` on `#0d1117` | 12.32 | PASS |
| terminal fail `#ffa198` on `#0d1117` | 9.74 | PASS |

Semantics: `<html lang="en">`, `<title>`, `<meta name="viewport">` all
present; no `outline: none`/`outline: 0` rule anywhere, so the user-agent
focus ring is intact; heading order starts at a single `<h1>`; all links carry
text (no icon-only links). No reduced-motion media query exists — acceptable
because the page has one `transition` declaration and no keyframe animation.

**Finding A11Y-1 (note):** `#8b949e` on white is 3.08 (below 4.5), but it is
used only by `.term .dim`, which renders on the dark terminal background
where it measures 6.15. No action; recorded so a future edit that moves that
token onto white is caught.

## 4. Malicious user (security bypass attempts, live)

| Attack | Command | Observed | Verdict |
|---|---|---|---|
| Approve my own ship gate | `aegis gate G4 --approve` (non-TTY) | `FAIL L0 ship approval: … needs a human on a TTY … autonomy=full cannot approve shipping`, **exit 7** | Refused correctly |
| Command injection via recorded text | `aegis chore "x; Remove-Item -Recurse C:\Windows\System32"` | Recorded as literal text, exit 0, nothing executed | Correct — text is data |
| Path traversal on export | `aegis evidence export --file ..\..\evil.json` | Wrote a private-safe aggregate to that path, exit 0 | Acceptable: the file is an aggregate with no raw state; path is the caller's own choice, not a sandbox escape |
| Symlinked host config | `aegis host install cursor` with `.cursor/hooks.json` → outside file | `FAIL …hooks.json is a link - Aegis never writes through links`, **exit 4**; outside file byte-identical afterwards | Correct (S1 mitigation) |
| Malformed config value | `aegis config set quality_profile bananas` | `FAIL quality_profile: strict|legacy`, exit 2 | Correct |
| Empty config value | `aegis config set quality_profile ""` | `FAIL unknown key 'quality_profile' …` | **FLAW (fixed)** — the same misleading branch as UX-1 |

No bypass found. The gate refusal is the important one: a non-TTY caller
cannot approve a ship gate, and `autonomy=full` is explicitly excluded.

## 5. Impatient user (double-submit, interruption)

| Flow | Command | Observed | Verdict |
|---|---|---|---|
| Run init twice | `aegis init --yes` after init | `FAIL .aegis already exists - pass --overwrite to reinitialize`, exit 2 | Good — no silent re-scaffold |
| Init, then look | `aegis init --yes --profile minimal` → `aegis status` | `state: 00a | lanes: 0/2` + `-> 00b legal` | Good |
| Repeat install | covered by adapter suites | no byte churn, no second backup | Good (R3) |

## 6. Method and reproduction

- Disposable repo: `%TEMP%\aegis-05b-walk` (git init + empty commit), all
  commands run from its root with the built `dist/cli.js`.
- Contrast: `node -e` implementing WCAG relative luminance
  (`(L1+0.05)/(L2+0.05)`) over the tokens extracted from `docs/index.html`.
- One measurement correction is recorded honestly: two `EXIT=-1` values in
  the first walk were broken-pipe artifacts of the walker's own
  `| Select-Object` truncation, not CLI behavior; they were re-measured
  without the pipe and are reported above as exit 0.

## 7. Findings summary

| ID | Severity | Status |
|---|---|---|
| UX-1 | minor | **resolved** (fixed, tested, suite green) |
| A11Y-1 | note | open (informational, no action) |

No critical a11y violation and no security bypass — the 05b red flag
(STOP + immediate escalation) did not trigger.
