# Known Issues — aegis-cli (baseline 2026-07-21, tool-cited)

1. ~~Circular dependency commands.ts <-> eval.ts~~ FIXED in v0.4.0 (COMMANDS
   now injected by the dispatcher; eval.ts has no reverse import).
   cites: `aegis ast build` (2026-07-21, v0.4.0: 26 modules, no DAG violation)
2. ~~Repo's own brain docs missing~~ FIXED 2026-07-21: this repo ran its own
   00d import bridge; `aegis import check` passes 4/4.
   cites: `aegis import check` (exit 0, 4/4 OK)
3. Tests: 101/101 PASS. cites: `npm test` (node --test test/*.test.js)
   Refreshed 2026-10-18 (v0.11 integration, tip `a6638d7`): 391/391 PASS.
   cites: `aegis validate tests` (skipped 0, todo 0, duration_ms 266828.4)
4. Dependencies: 0 vulnerabilities. cites: `aegis validate deps` (npm audit --json)
   Refreshed 2026-10-18: Node-bundled `npm audit --audit-level=high` ->
   found 0 vulnerabilities (the contract's prescribed method; v0.10 HANDOVER
   §4). `aegis validate deps` itself honestly reports UNMEASURED in this
   environment: the PATH npm 12.2.0 cannot audit `npm-shrinkwrap.json`
   (ENOLOCK). Both records kept.
5. Contracts suite: UNMEASURED by design (no contracts dir in this repo).
   cites: `aegis validate contracts`
   STALE since the v0.11 N1 contracts PR (`src/contracts/` shipped):
   refreshed 2026-10-18 -> PASS - typescript typecheck clean, contracts
   present. cites: `aegis validate contracts` (exit 0)
6. ~~Global-install sharp edge~~ MITIGATED in v0.5.1: hooks bake the CLI
   version and warn (never block) when the resolved aegis differs (ghost
   binary tripwire); repair via `aegis hooks` / `aegis update`.
   cites: test/afk.test.js version-stamp test
8. Exit-5 escalation parking AFK runs is BY DESIGN (tripwire). v0.5.1 added
   the doctor attention report (what will park a run, before it parks) and
   the recovery command in the exit-5 message itself.
   cites: test/afk.test.js attention + recovery-hint tests
7. ~~Concurrent state mutations lose events~~ FIXED in v0.4.1 (lockfile
   around read-modify-write; stale locks stolen). Measured after fix: 6/6
   events x5 trials, 10/10 concurrent exec.
   cites: docs/PLATFORM-MATRIX.md "shared-tree concurrency (re-run v0.4.1)"

## v0.11 bug-hunt ledger (05c, 2026-10-18)

Refreshed findings at source `fb1779a`. Every line cites a tool + command.

9. **FIXED (minor, UX):** `aegis config set <valid-key>` without a value
   reported `unknown key '<key>'` while listing that key as valid; a bare
   `config set` printed `unknown key 'undefined'`. Both now name the real
   problem. cites: `test/config.test.js` "config set: missing value and
   missing key are named honestly" (RED -> GREEN); full suite 391/391.
10. **NO DEFECT — skip audit:** the suite's three `.skip(` sites are
    environment guards, not hidden skips: two skip only when the OS refuses
    symlink creation (`EPERM`/`EACCES`), one when the no-share file pin cannot
    be established. On this host all three executed (suite reported
    `skipped 0`). cites: `aegis validate tests` (skipped 0, todo 0).
11. **NO DEFECT — flake audit:** zero quarantined lanes; no silent retries in
    the suite. cites: `aegis quarantine list` -> "no quarantined lanes".
12. **OPEN (note, environmental):** `aegis validate deps` reports UNMEASURED
    here because PATH npm 12.2.0 cannot read `npm-shrinkwrap.json` (ENOLOCK).
    The contract's Node-bundled npm reports 0 vulnerabilities. Not a code
    defect; kept visible so a future release does not read the UNMEASURED line
    as a regression. cites: v0.10 HANDOVER §4; Node-bundled
    `npm audit --audit-level=high`.
13. **OPEN (note, pre-existing):** `#8b949e` on white is 3.08:1, below AA. It
    renders only on the dark terminal panel (6.15:1 there). Recorded so a
    future token move is caught. cites: `brain/quality/accessibility-audit.md`.

## v0.11 exact-commit CI ledger (2026-10-19)

CI on `59f1f52` and `b9c7a67` was **red** (test job, all three runners) while
the same suite passed locally. Two deterministic environment differences, both
found, fixed and re-verified; CI is green at `c7f8870`.

14. **FIXED (Major):** `aegis doctor` printed drift/attention notes to stdout
    *after* the JSON report, so `JSON.parse(stdout)` failed whenever a note
    existed. Locally the skill stores exist, so no note fired; on a fresh
    runner 19 routed blades are missing and every machine consumer broke.
    Advisory lines now go to stderr. cites: `gh run view 39133357948 --log`
    (`not ok 36`, "Unexpected non-whitespace character after JSON"); local
    repro with `AEGIS_SKILL_STORES` at nonexistent dirs (position 424, line
    20); regression test "doctor stdout stays machine-parseable JSON when
    drift notes exist"; green CI `gh run view 39238554395`.
15. **FIXED (Minor):** `test/pm-detect.test.js` asserted
    `status !== 'UNMEASURED'`, which only holds where pnpm/yarn are installed.
    The runner-less outcome is correctly UNMEASURED naming the cause, so the
    assertion now accepts PASS/FAIL/UNMEASURED and requires the cause when
    UNMEASURED. cites: `gh run view 39133357948 --log` (`not ok 334`,
    "Expected \"actual\" to be strictly unequal to: 'UNMEASURED'"); isolated
    PATH repro recording `pnpm not found on PATH`; green CI
    `gh run view 39238554395` (`# tests 395`, `# fail 0`).
