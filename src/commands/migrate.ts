import fs from 'node:fs';
import { die, ok, readJ, writeJ } from '../lib/util.js';
import { SCHEMA_VERSION, stateP, configP } from '../lib/state.js';

/** aegis migrate - schema migrations for .aegis state across CLI versions (O7). */
const MIGRATIONS: Record<number, (s: any) => any> = {
  // 1: (s) => { ...v1 -> v2...; return s; }  (future)
};

export function migrate(): void {
  if (!fs.existsSync(stateP)) die(2, 'no state - run aegis init first');
  const s = readJ<any>(stateP);
  const from = s.schema_version ?? 0;
  if (from === SCHEMA_VERSION) { ok(`schema already at v${SCHEMA_VERSION} - nothing to migrate`); return; }
  if (from > SCHEMA_VERSION) die(12, `state v${from} is NEWER than CLI v${SCHEMA_VERSION} - upgrade the CLI`);
  let cur = s;
  for (let v = from; v < SCHEMA_VERSION; v++) {
    if (!MIGRATIONS[v]) die(12, `no migration path v${v} -> v${v + 1}`);
    cur = MIGRATIONS[v](cur);
  }
  cur.schema_version = SCHEMA_VERSION;
  writeJ(stateP, cur);
  if (fs.existsSync(configP)) {
    const c = readJ<any>(configP);
    c.schema_version = SCHEMA_VERSION;
    writeJ(configP, c);
  }
  ok(`migrated schema v${from} -> v${SCHEMA_VERSION}`);
}
