# DB Schema — aegis-cli

INFERRED - CONFIRMED? no

**No persistence layer detected** — no database, no ORM, no migrations.
source: package.json (only runtime dep is ts-morph; no pg/sqlite/prisma)

State lives in JSON files, schema_version 1, loaded via `src/lib/state.ts`:

- `.aegis/state.json` — pipeline position, gates, lanes, loop counters,
  fix/chore log. source: src/lib/state.ts (interface State)
- `.aegis/config.json` — interview answers incl. custom validate_suites.
  source: src/lib/state.ts (interface Config)
- `.aegis/transitions.json` — state machine as data (edges, gates, max_loop).
  source: src/templates/transitions.ts
- `.aegis/checkpoints/cp-*.json` — snapshot + git SHA + file hashes.
  source: src/commands/persist.ts

Migrations across schema versions: `aegis migrate`. source: src/commands/migrate.ts
