import fs from 'node:fs';
import path from 'node:path';
import { REPO, die, ok } from '../lib/util.js';
import { resolveState, commitState } from '../lib/state.js';

/** Demo-approval gate (SPEC §10, CONSTRAINTS §6): the prototype track made
 *  mechanical. `demo record` pins the artifact (UI: full HTML prototype with
 *  palette, type, components, states; non-UI: contracts + sequence + sample
 *  trace). Human approval lands via `aegis gate DEMO --approve` (TTY
 *  retype, like every gate). The 04a-entry edges (03b, 06d, 06e) carry
 *  `gate: DEMO`, so `transition 04a` - the single funnel into production
 *  lanes - refuses pre-approval. The demo loop itself stays unbounded and
 *  human-led: re-record as often as review iterates; history keeps the trail.
 *  App-scoped in multi-app repos (--app, like all pipeline mutations). */

export interface DemoRecord { kind: 'ui' | 'contract'; files: string[]; at: string }

function filesOf(args: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < args.length; i++)
    if (args[i] === '--file' && args[i + 1]) out.push(args[++i]);
  return out;
}

export function demo(args: string[]): void {
  const op = args[0];
  if (op === 'record') {
    const ki = args.indexOf('--kind');
    const kind = ki >= 0 ? args[ki + 1] : undefined;
    if (kind !== 'ui' && kind !== 'contract')
      die(2, 'usage: aegis demo record --kind <ui|contract> --file <path> [--file ...] [--app <name>]');
    const files = filesOf(args);
    if (!files.length) die(2, 'demo record needs at least one --file <path>');
    for (const f of files) {
      const abs = path.resolve(REPO, f);
      if (!fs.existsSync(abs)) die(4, `demo artifact missing: ${f} (record what exists - never what is planned)`);
    }
    if (kind === 'ui' && !files.some((f) => f.toLowerCase().endsWith('.html')))
      die(4, 'UI demo needs at least one .html prototype (palette, type, components, states, exact working style)');
    const ctx = resolveState(args, true);
    const s = ctx.s as any;
    const at = new Date().toISOString();
    const prev = s.demo ? ' (supersedes prior demo record)' : '';
    s.demo = { kind, files, at } as DemoRecord;
    s.history.push({ skill: s.current_skill, at, event: `demo-record ${kind}: ${files.join(', ')}` });
    commitState(ctx.p, s);
    ok(`demo recorded${ctx.app ? ` (app ${ctx.app})` : ''}: ${kind} [${files.join(', ')}]${prev} - human approves: aegis gate DEMO --approve`);
    return;
  }
  if (op === 'status') {
    const ctx = resolveState(args, false);
    const s = ctx.s as any;
    const gate = s.gates?.DEMO;
    if (s.demo) console.log(`demo: ${s.demo.kind} [${s.demo.files.join(', ')}] (recorded ${s.demo.at})`);
    else console.log('demo: none recorded (aegis demo record --kind <ui|contract> --file <path>)');
    console.log(`gate DEMO: ${gate?.status === 'approved' ? `approved (${gate.at}, by ${gate.by})` : 'OPEN - production lanes stay shut'}`);
    return;
  }
  die(2, 'usage: aegis demo <record|status> [--app <name>]');
}
