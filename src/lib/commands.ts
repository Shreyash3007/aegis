import { init, doctorCmd } from '../commands/lifecycle.js';
import { status, next, gate, transition, contracts, loops, lane } from '../commands/state.js';
import { checkpoint, resume } from '../commands/persist.js';
import { ast } from '../commands/ast.js';
import { sync, gc } from '../commands/sync.js';
import { config } from '../commands/config.js';
import { merge } from '../commands/merge.js';
import { slice } from '../commands/slice.js';
import { validate } from '../commands/validate.js';
import { monitor } from '../commands/monitor.js';
import { evalCmd } from '../commands/eval.js';
import { migrate } from '../commands/migrate.js';
import { fix, chore } from '../commands/fix.js';
import { importCmd } from '../commands/import.js';
import { update } from '../commands/update.js';

/** The dispatch table - single source of truth for the command set. COMMANDS
 *  is derived from its keys, so cli.ts and eval.ts can never drift. */
const DISPATCH: Record<string, (args: string[]) => void | Promise<void>> = {
  init, doctor: doctorCmd, status, next, gate, transition, contracts, loops, lane,
  checkpoint, resume, ast, sync, gc, config, merge, slice, validate, monitor,
  eval: evalCmd, migrate, fix, chore, import: importCmd, update,
};

export const COMMANDS: string[] = Object.keys(DISPATCH);

/** Run a command by name. Returns false for unknown names (cli.ts owns help/errors). */
export async function run(cmd: string, args: string[]): Promise<boolean> {
  const fn = DISPATCH[cmd];
  if (!fn) return false;
  await fn(args);
  return true;
}
