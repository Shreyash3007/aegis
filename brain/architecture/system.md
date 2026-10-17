# System Architecture — aegis-cli

INFERRED - CONFIRMED? no
source: src/lib/commands.ts (dispatch table), src/cli.ts (entry), package.json

## Components

- **Entry**: `src/cli.ts` — argv parsing, help text, exit-code contract.
  source: src/cli.ts
- **Dispatch**: `src/lib/commands.ts` — single dispatch table; `COMMANDS`
  derived from its keys so cli.ts and eval.ts cannot drift.
  source: src/lib/commands.ts
- **Commands** (30 files, `src/commands/`): lifecycle (init/doctor), state
  machine (status/next/gate/transition/loops/lane/contracts), persistence
  (checkpoint/resume), ast (ts-morph graph), sync/gc, merge oracle, slice
  worktrees, validate (5 builtin suites + custom), eval harness, monitor,
  migrate, fix/chore fast lane, import check, update, quality/tdd receipts,
  evidence records, host capability surface (`host`, v0.11).
  source: src/commands/*.ts
- **Core libs** (`src/lib/`): state.ts (State/Config/Transitions + JSON
  loading), util.ts (repo-root discovery, git helpers, die/ok), hooks.ts
  (git hook scripts + chaining), detect.ts (environment doctor), hashes.ts
  (checkpoint integrity), interview.ts (00b setup), templates/transitions.ts
  (state machine as data).
  source: src/lib/*.ts
- **Contracts (N1)**: `src/contracts/` pins the command surface + exit codes
  (`commands.ts`) and document schemas - host capability declarations
  (`hosts.ts`) and release evidence v2 (`evidence.ts`); the merge oracle
  refuses contract drift in slice branches. source: src/contracts/
- **Host adapters (v0.11 "Reach")**: capability declarations in
  `src/hosts/declarations.ts` (empty until the R2 slice), the packed surface
  `aegis host list|inspect` in `src/commands/host.ts`, and per-host thin
  adapters (`src/adapters/<host>.ts`) landing per R3 slice.
  source: src/contracts/hosts.ts, src/commands/host.ts
- **Skills**: 66 markdown files under `skills/` — own all judgment; installed
  to `.aegis/skills/` at init. source: skills/
- **Data flow**: agent/human -> cli.ts -> dispatch -> command -> reads/writes
  `.aegis/*.json` (machine state, gitignored) + `brain/` (committed docs).
  Checkpoints hash brain + state files; resume verifies. source: src/commands/persist.ts
