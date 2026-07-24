# Known Issues — aegis-cli (baseline 2026-07-21, tool-cited)

1. ~~Circular dependency commands.ts <-> eval.ts~~ FIXED in v0.4.0 (COMMANDS
   now injected by the dispatcher; eval.ts has no reverse import).
   cites: `aegis ast build` (2026-07-21, v0.4.0: 26 modules, no DAG violation)
2. ~~Repo's own brain docs missing~~ FIXED 2026-07-21: this repo ran its own
   00d import bridge; `aegis import check` passes 4/4.
   cites: `aegis import check` (exit 0, 4/4 OK)
3. Tests: 101/101 PASS. cites: `npm test` (node --test test/*.test.js)
4. Dependencies: 0 vulnerabilities. cites: `aegis validate deps` (npm audit --json)
5. Contracts suite: UNMEASURED by design (no contracts dir in this repo).
   cites: `aegis validate contracts`
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
