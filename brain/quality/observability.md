# v0.11 Observability Record (07b)

Header: 2026-10-18 | source `d773e37` | L2 | every claim below was executed,
not designed on paper.

## 1. Signal surfaces that exist in the shipped CLI

| Signal | Mechanism | Evidence |
|---|---|---|
| State transitions + events | `.aegis/state.json` `history` (append-only; 200 events at this tip) | read from the live state file |
| Executed commands | `aegis exec -- <cmd>` records command + exit code into history, checkpoints the run, and passes the exit code through | `src/commands/exec.ts:11-15,58-69` |
| Quality receipts | `.aegis/quality/<kind>-<branch>.json` bound to branch + commit + plan SHA-256 | `.aegis/quality/` (acceptance + review receipts) |
| Checkpoints / integrity | checkpoint files with per-file hashes; `resume` refuses exit 6 naming the modified file | live: tamper → `MODIFIED: brain\context-window.md` |
| Credential redaction | `src/lib/redact.ts` (URL userinfo, Authorization/Cookie headers, `-u`/`--user`, `*TOKEN|SECRET|PASSWORD|API_KEY=`, `sk-…`/`ghp_…`/`xox…`) | `src/lib/redact.ts:3-10`; `test/audit-redaction.test.js` green |
| External health | monitor target `https://shreyash3007.github.io/aegis/` (3000 ms benchmark) | see §2 |
| Release evidence | schema-v2 publisher (R4) binding SHA + CI + results + artifact hash + limitations | `docs/releases/v0.11/evidence-publisher-quality.json` |

## 2. Live monitor verification (executed now)

```
node dist/cli.js monitor target list
  https://shreyash3007.github.io/aegis/ (benchmark 3000ms)

node dist/cli.js monitor --once
  OK monitor: HEALTHY - 1 targets within thresholds   (exit 0)
```

The target is registered and reachable within its threshold at this tip. No
target is claimed as verified that was not just checked.

## 3. SLI/SLO position (honest gaps)

| Item | Status |
|---|---|
| CLI startup latency | Measured: **376 ms median** over 5 runs (`aegis status`). No SLO recorded, so this is a baseline, not a pass/fail. |
| Bundle size | Budgeted and enforced: 390 kb vs 450 kb (`validate perf`). |
| Public site availability | Monitored, 1 target, 3000 ms threshold, HEALTHY now. |
| Error tracking service (Sentry/etc.) | **Not integrated** — out of scope for a local CLI package; failures surface as exit codes + stderr, and `exec`/history record them. |
| Trace IDs | **Not applicable** — single-process CLI, no distributed request path. Not invented to look complete. |
| Metrics endpoint / dashboards | **Not present** — no long-running service to scrape. Recorded as a deliberate absence, not an omission. |
| PII logging | Config `pii_logs: false`; redaction is applied on state/log surfaces. |

## 4. What would be monitored if this shipped as a service

Recorded so the gap is planned rather than forgotten: a metrics exporter, a
latency histogram per command, and an error-rate alert. None apply to the
current artifact (a CLI distributed as a package), so none are claimed.

## 5. Verification

- Every row in §1 cites a file or a live command.
- §2 is a fresh execution at this tip, not a copied earlier result.
- Absences are labeled as absences with a reason, not silently skipped.

## 6. Verdict

Observability is **sufficient for the artifact class**: local execution is
fully reconstructable from state history + checkpoints + quality receipts,
credentials are redacted, and the one external surface is monitored live. No
observability blocker for 07c/08a.
