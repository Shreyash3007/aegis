#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMMANDS, run } from './lib/commands.js';

const [cmd, ...args] = process.argv.slice(2);

const HELP = `aegis - the enforcement layer for AI-native development

Usage: aegis <command> [args]  (aegis help <command> prints detail + an example)

Setup (once per repo):
  init [--yes] [--overwrite] [--apps web,api] [--profile minimal|standard|full]
                               scaffold .aegis/ + brain/ + git hooks + interview
                               (--apps declares per-app states: monorepo, v0.4)
                                (--profile: minimal = standalone tools only, no
                                 hooks/brain; standard = full pipeline, default;
                                 full = reserved, currently same as standard)
  hooks [--profile minimal|standard|strict]
                               reinstall git hooks at a strictness profile
                               (minimal = post-commit only; standard = the three
                                hooks; strict = standard + validate tests on push)
  remove                       uninstall: drop .aegis/, restore foreign hooks,
                               un-ignore; refuses with open slices; brain/ kept
  doctor [--save]              detect environment, prune stale worktrees, drift notes

Daily position (where am I, what is next):
  status [--app <name>] [--markdown]
                               current state, legal transitions, lanes, machinery
                               (multi-app: summary without --app, detail with)
                               (--markdown also writes a portable brain/handoff.md)
  next                         recommended next legal skill (lists all legal edges)
  fix start <desc> / done / abandon --reason t
                               fast lane for small fixes (tests must pass to close)
  chore <desc>                 record a docs/config-class change (no lifecycle)
  exec [--timeout <s>] -- <cmd>  run a command recorded + checkpointed (executor waves)
  wave [--budget N]             executor prompt + optional logical-judgment ceiling (not a dollar budget)

Pipeline (the funnel into production lanes):
  transition <skill> [--reason t] [--app <name>]  record a validated transition
  gate <name> --approve [--evidence <ref>] [--app <name>]   record human gate approval (+ evidence pointer; DEMO pins the artifact)
  contracts                    verify contracts merged to base branch (unlocks 04a)
  merge check <branch> [--require-proof] [--require-quality]  pinned merge + typecheck + contracts + enrolled evidence
  loops reset --reason <t>     zero loop/cycle counters after human review (audited)
  lane <open|close> <slice>    parallel lane management (cap enforced)
  slice <create|list|remove>   worktree-per-slice + lane management (Phase 6)
  clean <branch> [--require-proof]  loop-until-clean gate: oracle verify + classify +
                               cycle accounting (3 cycles = escalate exit 5;
                               unchanged-SHA re-run = doubt theater exit 5)
  quarantine <freeze|clear|list> <target> --reason t
                               park a failing lane: oracle refuses it until a
                               human clears (siblings continue on last-good)
  demo <record|status>         prototype track: pin the demo artifact (UI html
                               or contracts+sequence+trace); DEMO gate approval
                               unlocks production lanes (transition 04a)

Evidence (prove it, or label it UNMEASURED):
  checkpoint [--quiet]         snapshot state + hashes
  evidence <usage|export --file <json>>  capture reported usage or export private-safe aggregate facts; absent metrics stay UNMEASURED
  quality <acceptance|review|status> <branch> [--file <plan.json>]  execute criteria or record review findings; --require-quality enables strict merge checks
  tdd <red|green|status> <branch>  run and pin test evidence; red needs --test-file and --expect-exit, green reuses the runner
  resume                       verify integrity, print reconstruction pack
  ast build|diff               ts-morph module graph / impact analysis (Phase 1)
  validate <suite>             contracts|tests|deps|perf|e2e + owner-declared
  validate acceptance <branch> --file <plan.json>  execute committed acceptance through the canonical quality checker
                               custom suites (config set validate_suite.<name> "<cmd>")
  typecheck                    run the repo's real typechecker (tsc / go vet /
                               cargo check / compileall) or degrade honestly
                               (UNMEASURED) - never fakes a pass (exit 0 / 9)
  monitor --once               one post-ship check pass for cron/CI (Phase 9)
  monitor target <add|remove|list>  manage the endpoints CI watches (07b writes them)
  eval <file|--all>            skill-file eval harness (Phase 10)
  eval trigger [--file cases.json] [--threshold f]
                               trigger precision via the judgment ring
                               (built-in self-test default; 0.8 gate)
  lint-skills [--all|<file>]    Margin Format gate: frontmatter, budgets,
                               body order, links, trigger collisions
  jev <judge|triage|score|classify|cite> --file <request.json>
                               judgment ring: batched Noul/Choice/Score over
                               direct TypeSafe HTTPS (needs TYPESAFE_API_KEY;
                               no key = degraded mode, announced verbatim;
                               judged states leave your machine - no secrets)
  memory <add|list|get|verify|retire|reconcile|promote|sync>
                               record memory: typed decision/contract/finding/
                               assumption records with confidence, citations,
                               expiry; contradictions open reconcile tasks
  import check                 verify 00d brownfield import bridge (brain docs cited)

System:
  config [set <key> <value>]   view/update setup interview answers
  blade <list|resolve <name>> [--root <checkout>]  verify optional Superpowers craft source against its pinned blob, or use native fallback
  sync [--refresh-skills]       regenerate context + transitions; explicit skill refresh preserves the prior snapshot without re-init
  gc                           checkpoint retention + brain hygiene (Phase 2)
  update [--check]             self-update from the latest tag's built release asset (installation scripts disabled)
  completions <bash|zsh|pwsh>  shell tab-completion for the command surface
  migrate                      schema migration across versions (Phase 12)

Run aegis help <command> for detail + an example.

Exit codes: 0 ok | 1 not a git repo | 2 malformed call or missing state |
3 blocked (no legal forward transition) | 4 well-formed but refused |
5 loop/cycle escalation (human required) | 6 integrity mismatch |
7 gate error (proof-of-human failed) | 8 ast cycles |
9 merge/validate/refusal gate fired | 10 monitor breach |
11 eval failure (below threshold) | 12 schema mismatch |
13 nothing to merge (never a pass)`;

if (!cmd || cmd === '--help') {
  console.log(HELP);
} else if (cmd === 'help') {
  // Per-command detail, generated FROM the help block above: the command's
  // own lines plus the exit-code legend. Cannot drift from `aegis help`.
  if (!args[0]) { console.log(HELP); }
  else {
    const esc = args[0].replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    if (!COMMANDS.includes(args[0])) {
      console.error(`unknown command: ${args[0]} (see: aegis help)`);
      process.exit(2);
    }
    const lines = HELP.split('\n');
    const own = (l: string): boolean => new RegExp(`^  ${esc}($| )`).test(l);
    const out: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (!own(lines[i])) continue;
      out.push(lines[i]);
      while (i + 1 < lines.length && /^\s{10,}\S/.test(lines[i + 1])) out.push(lines[++i]);
    }
    const exitAt = lines.findIndex((l) => l.startsWith('Exit codes:'));
    console.log([...out, '', ...lines.slice(exitAt)].join('\n'));
  }
} else if (cmd === 'completions') {
  // Shell tab-completion, generated FROM the dispatch table so it can never
  // name a retired command. Lives here (not a command module) because the
  // generator needs COMMANDS while command modules must never import the
  // dispatcher back - that cycle is exactly what 02a forbids. Completes
  // command names only (first word); flags stay explicit, never guessed.
  const names = [...new Set([...COMMANDS, 'completions', 'help'])].sort().join(' ');
  const shell = args[0];
  if (shell === 'bash') console.log(`# aegis completion (bash) - generated by: aegis completions bash\n# Install by evaluating the generator output once in your shell profile.\n_aegis_complete() {\n  COMPREPLY=()\n  [[ $COMP_CWORD -eq 1 ]] || return\n  local cur="\${COMP_WORDS[COMP_CWORD]}"\n  COMPREPLY=($(compgen -W "${names}" -- "$cur"))\n}\ncomplete -F _aegis_complete aegis`);
  else if (shell === 'zsh') console.log(`# aegis completion (zsh) - generated by: aegis completions zsh\n_aegis_complete() {\n  local -a cmds; cmds=(${names.split(' ').map((c) => `'${c}'`).join(' ')});\n  _describe 'aegis command' cmds\n}\ncompdef _aegis_complete aegis`);
  else if (shell === 'pwsh') console.log(`# aegis completion (pwsh) - generated by: aegis completions pwsh - add to $PROFILE\nRegister-ArgumentCompleter -Native -CommandName aegis -ScriptBlock {\n  param($wordToComplete)\n  @(${names.split(' ').map((c) => `'${c}'`).join(', ')}) | Where-Object { $_ -like "$wordToComplete*" }\n}`);
  else {
    console.error('usage: aegis completions <bash|zsh|pwsh>');
    process.exit(2);
  }
} else if (cmd === 'version' || cmd === '--version' || cmd === '-v') {
  const pkg = JSON.parse(fs.readFileSync(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'package.json'), 'utf8'));
  console.log(`aegis ${pkg.version}`);
} else if (!(await run(cmd, args))) {
  console.error(`unknown command: ${cmd}\n\n${HELP}`);
  process.exit(2);
}
