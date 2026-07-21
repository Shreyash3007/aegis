#!/usr/bin/env node
import { init, doctorCmd } from './commands/lifecycle.js';
import { status, next, gate, transition, contracts, lane } from './commands/state.js';
import { checkpoint, resume } from './commands/persist.js';
import { ast } from './commands/ast.js';
import { sync, gc } from './commands/sync.js';
import { config } from './commands/config.js';
import { merge } from './commands/merge.js';
import { slice } from './commands/slice.js';
import { validate } from './commands/validate.js';
import { monitor } from './commands/monitor.js';
import { evalCmd } from './commands/eval.js';
import { migrate } from './commands/migrate.js';

const [cmd, ...args] = process.argv.slice(2);

const PLANNED: Record<string, string> = {
  eval: 'Phase 10', migrate: 'Phase 12',
};

const HELP = `aegis - the enforcement layer for AI-native development

Usage: aegis <command> [args]

Phase 0 (this build):
  init [--yes] [--overwrite]   scaffold .aegis/ + brain/ + git hooks + interview
  doctor [--save]              detect environment, prune stale worktrees
  status                       current state, legal transitions, lanes
  next                         the ONE legal next skill
  gate <name> --approve        record human gate approval
  transition <skill> [--reason t]  record a validated transition
  contracts                    verify contract PR merged (unlocks 04a)
  lane <open|close> <slice>    parallel lane management (cap enforced)
  checkpoint [--quiet]         snapshot state + hashes
  resume                       verify integrity, print reconstruction pack
  ast build|diff               ts-morph module graph / impact analysis (Phase 1)
  sync                         regenerate AGENTS.md + CLAUDE.md (Phase 2)
  gc                           checkpoint retention + brain hygiene (Phase 2)
  config [set <key> <value>]   view/update setup interview answers
  merge check <branch>         merge oracle: real merge + tsc + contracts (Phase 6)
  slice <create|list|remove>   worktree-per-slice + lane management (Phase 6)
  validate <suite>             contracts|tests|deps|perf|e2e with citations (Phase 7)
  monitor --once               one post-ship check pass for cron/CI (Phase 9)
  eval <file|--all>            skill-file eval harness (Phase 10)
  migrate                      schema migration across versions (Phase 12)

Planned: ${Object.entries(PLANNED).map(([k, v]) => `${k} (${v})`).join(', ')}

Exit codes: 0 ok | 1 not a git repo | 2 missing/unexpected state | 3 blocked |
4 illegal action | 5 loop/cycle | 6 integrity mismatch | 7 gate error | 12 schema mismatch`;

switch (cmd) {
  case 'init': await init(args); break;
  case 'doctor': doctorCmd(args); break;
  case 'status': status(); break;
  case 'next': next(); break;
  case 'gate': gate(args); break;
  case 'transition': transition(args); break;
  case 'contracts': contracts(); break;
  case 'lane': lane(args); break;
  case 'checkpoint': checkpoint(args); break;
  case 'ast': ast(args); break;
  case 'sync': sync(); break;
  case 'gc': gc(); break;
  case 'config': config(args); break;
  case 'merge': merge(args); break;
  case 'slice': slice(args); break;
  case 'validate': validate(args); break;
  case 'monitor': await monitor(args); break;
  case 'eval': evalCmd(args); break;
  case 'migrate': migrate(); break;
  case 'resume': resume(); break;
  case undefined:
  case 'help':
  case '--help': console.log(HELP); break;
  default:
    if (cmd && PLANNED[cmd]) {
      console.error(`'${cmd}' is planned for ${PLANNED[cmd]} - not in Phase 0 build`);
      process.exit(2);
    }
    console.error(`unknown command: ${cmd}\n\n${HELP}`);
    process.exit(2);
}
