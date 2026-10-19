# v0.11 Security Gap Report (05b — malicious persona)

Header: 2026-10-18 | source `59f1f52` | method: **live bypass attempts**
against the built CLI in a disposable repo, mapped to the v0.11 threat model
(`brain/quality/security-audit.md`, 02c refresh 2026-10-17).

## 1. Attempts and outcomes

| # | Threat class | Attempt | Observed | Verdict |
|---|---|---|---|---|
| S1 | Gate self-approval | `aegis gate G4 --approve` from a non-TTY caller | `FAIL L0 ship approval: gate G4 --approve needs a human on a TTY (retype-to-confirm); non-interactive use requires AEGIS_HUMAN_TOKEN=1 … autonomy=full cannot approve shipping` — **exit 7** | **Refused** — ship gates cannot be agent-approved, and `autonomy=full` is explicitly excluded |
| S2 | Command injection via recorded free text | `aegis chore "x; Remove-Item -Recurse C:\Windows\System32"` | Text stored verbatim, nothing executed — exit 0 | **Safe** — recorded text is data; `exec` uses literal argv |
| S3 | Write-through-link (TOCTOU-adjacent) | `.cursor/hooks.json` symlinked to a file outside the repo, then `aegis host install cursor` | `FAIL …hooks.json is a link - Aegis never writes through links; replace or remove it and re-run` — **exit 4**; the outside file is byte-identical afterwards | **Refused before any write** — S1 mitigation holds |
| S4 | Linked repository root | (covered by suite) `src/lib/util.ts` refuses a symlinked repo root and a linked `.git` entry | `test/adverse-scenarios.test.js` green | **Refused** |
| S5 | Path traversal / private-path leak | `aegis evidence export --file ..\..\evil.json` | Wrote a **private-safe aggregate** (no raw state, no secrets) to the caller-chosen path — exit 0 | **Acceptable** — the caller owns their filesystem path; publication content is redacted and refuses private-path/credential values |
| S6 | Credential / prompt leakage into release evidence | (covered by suite) `src/commands/evidence.ts:81-85,125` | `test/evidence-publish.test.js` negative fixtures refuse credentials, private paths, raw prompt blobs, reported-cost-as-billing | **Refused** |
| S7 | Input validation bypass | `aegis config set quality_profile bananas` / `""` | `FAIL quality_profile: strict|legacy` (exit 2); empty value reported misleadingly | **Refused**; message flaw fixed this cycle (see `ux-flaw-report.md` UX-1) |
| S8 | Overwrite of prior release evidence | (covered by suite) `evidence.ts:42` create-only + `EEXIST` refusal at `:108` | `test/evidence-publish.test.js` green | **Refused** |
| S9 | Malformed/ambiguous host config adoption | (covered by suite) stray/duplicated aegis entries, pre-existing backup, `managed > 1` | `test/adapters-*.test.js` (all three adapters) green | **Refused, never guessed** |

## 2. Residual risks (unchanged, kept visible)

- **Not an OS sandbox.** A local attacker with write access and timing
  control is outside the boundary — lstat-then-act windows remain (recorded in
  the v0.10 audits and the v0.11 contract's "Limits that must stay visible").
- **Symlink checks are best-effort**, not atomic with the write.
- **Export destination is caller-chosen**; content is redacted, but Aegis does
  not sandbox where you point it.
- **Host adapter verification is fixture/procedure-level.** A recorded smoke
  is not a continuous guarantee of a third-party host's behavior.

## 3. Verdict

No security bypass found in the live attempts. No critical or high finding
opened by this walk. The 05b red flag ("security bypass → STOP") did not
trigger. Residual risks are pre-existing, documented, and unchanged by v0.11.
