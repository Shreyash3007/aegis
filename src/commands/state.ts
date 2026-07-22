import fs from 'node:fs';
import { die, git, gitTry, ok, writeJ } from '../lib/util.js';
import { loadState, loadStateFrom, loadTransitions, loadConfig, contractsPath, declaredApps, appStatePath, resolveState, commitState, acquireState, stateP, State, Transitions, Edge } from '../lib/state.js';

function blockers(s: State, t: Transitions, e: Edge): string[] {
  const b: string[] = [];
  if (e.gate && s.gates[e.gate]?.status !== 'approved') b.push(`gate ${e.gate} (${t.gates[e.gate]}) OPEN`);
  if (e.requiresContracts && !s.contracts_merged) b.push('contracts UNMERGED');
  const loop = s.loop_counters[`${e.from}->${e.to}`] || 0;
  if (loop >= t.max_loop) b.push(`edge loop limit ${loop}/${t.max_loop}`);
  if ((s.state_visits[e.to] || 0) >= t.max_loop) b.push(`state ${e.to} visited ${s.state_visits[e.to]}x (cycle guard)`);
  return b;
}

export function status(args: string[] = []): void {
  const apps = declaredApps();
  // Multi-app without --app: repo-level summary, one line per app.
  if (apps.length && !args.includes('--app')) {
    const root = loadState();
    console.log(`multi-app repo (apps: ${apps.join(', ')}) | lanes: ${root.lanes.active.length}/${root.lanes.max} [${root.lanes.active.join(', ')}]`);
    for (const a of apps) {
      const s = loadStateFrom(appStatePath(a));
      console.log(`  ${a}: ${s.current_skill}${s.fix?.active ? ` | fix OPEN "${s.fix.active.desc}"` : ''}`);
    }
    console.log('detail: aegis status --app <name>');
    return;
  }
  const { s, app } = resolveState(args, false);
  const t = loadTransitions();
  console.log(`${app ? `app: ${app} | ` : ''}state: ${s.current_skill} | lanes: ${s.lanes.active.length}/${s.lanes.max} [${s.lanes.active.join(', ')}]`);
  if (s.fix?.active) console.log(`fix OPEN: "${s.fix.active.desc}" (since ${s.fix.active.opened_at}) - close: aegis fix done`);
  const tb = loadConfig().token_budget;
  if (tb) console.log(`token budget: ${tb} (advisory)`);
  for (const e of t.edges.filter((e) => e.from === s.current_skill)) {
    const b = blockers(s, t, e);
    console.log(`  -> ${e.to}${e.backward ? ' (rollback)' : ''} ${b.length ? 'BLOCKED: ' + b.join(', ') : 'legal'}`);
  }
}

export function next(args: string[] = []): void {
  const { s, app } = resolveState(args, true); // pipeline-specific: multi-app requires --app
  const t = loadTransitions();
  const legal = t.edges.filter((e) => e.from === s.current_skill && !e.backward && blockers(s, t, e).length === 0);
  if (!legal.length) die(3, `Blocked at ${s.current_skill}${app ? ` (app ${app})` : ''} - no legal forward transition (run aegis status)`);
  console.log(`next legal skill: ${legal[0].to} (recommended)`);
  for (const e of legal.slice(1)) console.log(`  also legal: ${e.to}`);
}

/** Synchronous one-line prompt on the controlling terminal (/dev/tty), so it
 *  works even when stdin is piped. Returns '' if no terminal is available. */
function ttyPrompt(question: string): string {
  try {
    const fd = fs.openSync('/dev/tty', 'r+');
    try {
      fs.writeSync(fd, question);
      const buf = Buffer.alloc(1024);
      const n = fs.readSync(fd, buf, 0, buf.length, null);
      return buf.toString('utf8', 0, n).trim();
    } finally { fs.closeSync(fd); }
  } catch { return ''; }
}

export function gate(args: string[]): void {
  if (!args.includes('--approve')) die(7, 'gate requires --approve (a human action)');
  const name = args[0];
  if (!name) die(7, 'usage: aegis gate <name> --approve');
  const t = loadTransitions();
  if (!t.gates[name])
    die(7, `unknown gate: ${name} (known: ${Object.keys(t.gates).join(', ')})`);
  // proof-of-human: passing --approve proves nothing - an agent can pass flags.
  // TTY: the human retypes the gate name to confirm. Non-TTY (agent in a
  // pipe/CI): refuse, unless AEGIS_HUMAN_TOKEN is set - the documented CI
  // escape hatch, attesting a human approved out-of-band (recorded as such).
  // autonomy=full (human chose it at init/config): gates stay enforced and
  // recorded, but are not TTY-bound - the trust-then-verify posture. This is
  // NOT cryptographic proof in any mode; it is an attributed audit trail.
  let by = 'human';
  if (process.env.AEGIS_HUMAN_TOKEN) {
    by = 'human-token';
  } else if (process.stdin.isTTY) {
    if (ttyPrompt(`gate ${name} (${t.gates[name]}): retype the gate name to confirm: `) !== name)
      die(7, `gate ${name} confirmation mismatch - approval refused`);
  } else if (loadConfig().autonomy === 'full') {
    by = 'autonomy-full';
    console.log(`note: gate ${name} approved under autonomy=full (non-TTY, recorded as autonomy-full)`);
  } else {
    die(7, `gate ${name} --approve needs a human on a TTY (retype-to-confirm); ` +
      'non-interactive use requires AEGIS_HUMAN_TOKEN=1 (CI escape hatch) ' +
      'or `aegis config set autonomy full` (trust-then-verify posture)');
  }
  const ctx = resolveState(args, true);
  const s = ctx.s;
  s.gates[name] = { status: 'approved', at: new Date().toISOString(), by };
  commitState(ctx.p, s);
  ok(`gate ${name} approved and recorded${ctx.app ? ` (app ${ctx.app})` : ''}`);
}

export function transition(args: string[]): void {
  const to = args[0];
  if (!to) die(4, 'usage: aegis transition <skill> [--reason <text>] [--app <name>]');
  const ctx = resolveState(args, true);
  const s = ctx.s;
  const t = loadTransitions();
  const e = t.edges.find((e) => e.from === s.current_skill && e.to === to);
  if (!e) die(4, `ILLEGAL transition ${s.current_skill} -> ${to} (no such edge)`);
  if (e.backward && !args.includes('--reason'))
    die(4, 'Backward transition requires --reason');
  const b = blockers(s, t, e);
  if (b.length) {
    const isEscalation = b.some((x) => x.includes('cycle guard') || x.includes('loop limit'));
    die(isEscalation ? 5 : 4, `${isEscalation ? 'ESCALATION' : 'ILLEGAL'}: ${b.join('; ')} - CLI refuses`);
  }

  // blockers() already refused at >= max_loop, so one traversal here can at
  // most REACH the limit; escalation fires on the NEXT attempt (single check).
  const key = `${e.from}->${e.to}`;
  s.loop_counters[key] = (s.loop_counters[key] || 0) + 1;
  // cycle guard (A1.3): per-edge counters miss ping-pong across DIFFERENT edges
  s.state_visits[to] = (s.state_visits[to] || 0) + 1;

  s.history.push({ skill: s.current_skill, at: new Date().toISOString() });
  s.current_skill = to;
  commitState(ctx.p, s);
  ok(`transition ${e.from} -> ${to} recorded${ctx.app ? ` (app ${ctx.app})` : ''} (edge ${s.loop_counters[key]}/${t.max_loop}, state-visits ${s.state_visits[to]}/${t.max_loop})`);
}

export function contracts(args: string[]): void {
  const ctx = resolveState(args, true);
  const s = ctx.s;
  const cp = contractsPath(ctx.app);
  if (!git(['ls-files', cp]).length || git(['status', '--porcelain', cp]))
    die(4, `contracts not committed (${cp})`);
  // N1 means MERGED TO BASE, not just committed on a branch: resolve the base
  // (origin/HEAD -> remote default -> local main/master) and require
  // the contracts path to exist in its tree.
  let base = gitTry(['rev-parse', '--abbrev-ref', 'origin/HEAD']);
  if (!base) {
    for (const cand of ['origin/main', 'origin/master', 'main', 'master']) {
      if (gitTry(['rev-parse', '--verify', cand])) { base = cand; break; }
    }
  }
  if (!base) die(4, 'no base branch found (origin/HEAD, origin/main, main) - cannot verify contract merge');
  if (!git(['ls-tree', '-r', '--name-only', base, '--', cp]))
    die(4, `${cp} not in ${base} - contract PR not merged to base branch`);
  const unmerged = gitTry(['diff', '--name-only', base, 'HEAD', '--', cp]);
  if (unmerged) die(4, `contract changes not merged to ${base}: ${unmerged.split('\n').join(', ')}`);
  s.contracts_merged = true;
  commitState(ctx.p, s);
  if (base.startsWith('origin/')) ok(`contract PR verified merged to ${base} - 04a unlocked (N1)${ctx.app ? ` (app ${ctx.app})` : ''}`);
  else ok(`contracts verified against local ${base}; ` +
    `${gitTry(['remote']) ? 'remote base branch not found' : 'no remote'} - UNVERIFIED for PR merge`);
}

/** loops reset - human-reviewed recovery from exit-5 escalation: zeroes the
 *  per-edge loop counters and per-state visit counters. Reason is mandatory
 *  and the event (reason + cleared counters) is appended to state history. */
export function loops(args: string[]): void {
  if (args[0] !== 'reset') die(4, 'usage: aegis loops reset --reason <text>');
  const ri = args.indexOf('--reason');
  const reason = ri >= 0 ? args[ri + 1] : undefined;
  if (!reason) die(4, 'loops reset requires --reason (recorded in the audit trail)');
  const ctx = resolveState(args, true);
  const s = ctx.s;
  const cleared = [...Object.keys(s.loop_counters), ...Object.keys(s.state_visits)];
  s.loop_counters = {};
  s.state_visits = {};
  s.history.push({
    skill: s.current_skill, at: new Date().toISOString(),
    event: 'loops-reset', reason, cleared,
  });
  commitState(ctx.p, s);
  ok(`loop + cycle counters reset (${cleared.length} cleared) - recorded in history`);
}

export function lane(args: string[]): void {
  const [op, slice] = args;
  const s = acquireState(stateP); // lanes are global (root state), lock held
  if (op === 'open') {
    if (!slice) die(4, 'usage: aegis lane open <slice>');
    if (s.lanes.active.length >= s.lanes.max)
      die(4, `LANE CAP: ${s.lanes.active.length}/${s.lanes.max} active - refuses to spawn (N5)`);
    s.lanes.active.push(slice);
    ok(`lane opened: ${slice} (${s.lanes.active.length}/${s.lanes.max})`);
  } else if (op === 'close') {
    s.lanes.active = s.lanes.active.filter((x) => x !== slice);
    ok(`lane closed: ${slice}`);
  } else die(4, 'usage: aegis lane <open|close> <slice>');
  commitState(stateP, s);
}
