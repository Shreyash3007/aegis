#!/usr/bin/env node
import { run } from './lib/commands.js';
const [cmd, ...args] = process.argv.slice(2);
const HELP = `aegis - the enforcement layer for AI-native development

Usage: aegis <command> [args]

Phase 0 (this build):
  init [--yes] [--overwrite] [--apps web,api]
                               scaffold .aegis/ + brain/ + git hooks + interview
                               (--apps declares per-app states: monorepo, v0.4)
  doctor [--save]              detect environment, prune stale worktrees, drift notes
  status [--app <name>]        current state, legal transitions, lanes
                               (multi-app: summary without --app, detail with)
  next                         recommended next legal skill (lists all legal edges)
  gate <name> --approve [--app <name>]   record human gate approval
  transition <skill> [--reason t] [--app <name>]  record a validated transition
  contracts                    verify contracts merged to base branch (unlocks 04a)
  loops reset --reason <t>     zero loop/cycle counters after human review (audited)
  lane <open|close> <slice>    parallel lane management (cap enforced)
  checkpoint [--quiet]         snapshot state + hashes
  resume                       verify integrity, print reconstruction pack
  ast build|diff               ts-morph module graph / impact analysis (Phase 1)
  sync                         regenerate AGENTS.md + CLAUDE.md (Phase 2)
  gc                           checkpoint retention + brain hygiene (Phase 2)
  config [set <key> <value>]   view/update setup interview answers
  merge check <branch>         merge oracle: real merge + tsc + contracts (Phase 6)
  slice <create|list|remove>   worktree-per-slice + lane management (Phase 6)
  validate <suite>             contracts|tests|deps|perf|e2e + owner-declared
                               custom suites (config set validate_suite.<name> "<cmd>")
  fix start <desc> / done / abandon --reason t
                               fast lane for small fixes (tests must pass to close)
  chore <desc>                 record a docs/config-class change (no lifecycle)
  import check                 verify 00d brownfield import bridge (brain docs cited)
  update [--check]             self-update from the latest GitHub tag tarball
  exec -- <cmd>                run a command recorded + checkpointed (executor waves)
  monitor --once               one post-ship check pass for cron/CI (Phase 9)
  eval <file|--all>            skill-file eval harness (Phase 10)
  migrate                      schema migration across versions (Phase 12)

All Phase 0-12 commands implemented.

Exit codes: 0 ok | 1 not a git repo | 2 missing/unexpected state | 3 blocked |
4 illegal action | 5 loop/cycle | 6 integrity mismatch | 7 gate error |
8 ast cycles | 9 merge/validate refusal | 10 monitor breach | 11 eval fail |
12 schema mismatch | 13 nothing to merge`;
if (!cmd || cmd === 'help' || cmd === '--help') {
    console.log(HELP);
}
else if (!(await run(cmd, args))) {
    console.error(`unknown command: ${cmd}\n\n${HELP}`);
    process.exit(2);
}
