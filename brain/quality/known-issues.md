# Known Issues — aegis-cli (baseline 2026-07-21, tool-cited)

1. ~~Circular dependency commands.ts <-> eval.ts~~ FIXED in v0.4.0 (COMMANDS
   now injected by the dispatcher; eval.ts has no reverse import).
   cites: `aegis ast build` (2026-07-21, v0.4.0: 26 modules, no DAG violation)
2. ~~Repo's own brain docs missing~~ FIXED 2026-07-21: this repo ran its own
   00d import bridge; `aegis import check` passes 4/4.
   cites: `aegis import check` (exit 0, 4/4 OK)
3. Tests: 63/63 PASS. cites: `npm test` (node --test test/*.test.js)
4. Dependencies: 0 vulnerabilities. cites: `aegis validate deps` (npm audit --json)
5. Contracts suite: UNMEASURED by design (no contracts dir in this repo).
   cites: `aegis validate contracts`
6. Global-install sharp edge: a dev-from-source `npm link` can go stale while
   PATH still resolves (observed 2026-07-21: global aegis pointed at a deleted
   temp copy). Mitigation: `aegis update` tarball path.
   cites: readlink -f $(which aegis) pointing into ~/.claude/jobs tmp dir
7. Concurrent state mutations on a shared tree are last-writer-wins (3/5
   trials lost one audit event). By design serialized per AGENTS.md; atomic
   writes keep integrity regardless.
   cites: docs/PLATFORM-MATRIX.md "shared-tree concurrency (2026-07-21)"
