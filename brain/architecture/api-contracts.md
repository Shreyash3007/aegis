# API Contracts — aegis-cli

INFERRED - CONFIRMED? no

**No network API detected** — the contract surface is the CLI itself.
source: package.json (bin: aegis -> dist/cli.js; no server framework deps)

The CLI contract (command -> exit codes) is documented in the help text and
README command table:
source: src/cli.ts (HELP + exit-code footer), README.md "Phase 0 Commands"

Key invariants:
- 0 ok | 1 not a git repo | 2 missing/unexpected state | 3 blocked |
  4 illegal action | 5 loop/cycle | 6 integrity mismatch | 7 gate error |
  8 ast cycles | 9 merge/validate refusal | 10 monitor breach | 11 eval fail |
  12 schema mismatch | 13 nothing to merge. source: src/cli.ts
- Every command's behavior is pinned by integration tests spawning dist/cli.js.
  source: test/*.test.js (52 tests)
- Custom validator contract: owner-declared command string, exit 0 = PASS,
  non-zero = FAIL, command recorded verbatim as citation.
  source: src/commands/validate.ts (runSuite)
