import fs from 'node:fs';
import path from 'node:path';
import { AEGIS_DIR, die, readJ, writeJ } from './util.js';

export const SCHEMA_VERSION = 1;

export interface GateRecord { status: 'approved'; at: string; by: string }
export interface FixRecord {
  kind: 'fix' | 'chore'; desc: string; opened_at: string;
  closed_at?: string; validation?: string; abandoned_reason?: string;
}
export interface HistoryEntry {
  skill: string; at: string;
  event?: string; reason?: string; cleared?: string[]; // loops-reset audit fields
}
export interface State {
  schema_version: number;
  current_skill: string;
  history: HistoryEntry[];
  loop_counters: Record<string, number>;
  state_visits: Record<string, number>;
  gates: Record<string, GateRecord>;
  lanes: { max: number; active: string[] };
  contracts_merged: boolean;
  // Fast lane (v0.3): small fixes/chores recorded on a parallel track instead
  // of forcing the full pipeline. The sizing IS the record - abuse is visible
  // in history, which is the enforcement. Optional: pre-0.3 states lack it.
  fix?: { active: FixRecord | null; log: FixRecord[] };
}
export interface Edge {
  from: string; to: string;
  gate?: string; backward?: boolean; requiresContracts?: boolean;
}
export interface Transitions {
  gates: Record<string, string>;
  edges: Edge[];
  max_loop: number;
}
export interface Config {
  schema_version: number;
  platform: string;
  mode: 'runtime' | 'manual';
  autonomy: 'assisted' | 'semi' | 'full';
  environment_level: 'L0' | 'L1' | 'L2';
  project_type: 'greenfield' | 'brownfield';
  ram_mb: number;
  human_lane_cap: number;
  ship_profile: 'prototype' | 'production';
  pii_logs: boolean;
  model_tiers: { strong: string; standard: string; light: string };
  lane_costs_mb: { browser_e2e: number; dev_server: number; codegen: number };
  stack?: string; // 00b interview Q3 - locked stack summary (manifest cites it)
  team?: 'solo' | 'small-team'; // 00b interview Q9 - docs depth
  token_budget?: number; // advisory only (06d) - surfaced in `aegis status`, never enforced
  validate_suites?: Record<string, string>; // owner-declared custom validators (aegis validate <name>)
  contracts_path?: string; // default 'src/contracts' - where N1 contracts live in THIS repo
  contracts_path_apps?: Record<string, string>; // v0.4.2: per-app overrides in multi-app repos
  apps?: string[]; // v0.4 monorepo: per-app pipeline states under .aegis/apps/
}

/** Where N1 contracts live (default src/contracts; BlindFolio trial: real
 *  projects keep them elsewhere, and a hardcoded path meant the N1 gate never
 *  fired there). v0.4.2: per-app override in multi-app repos - web/plan vs
 *  pw-ai/plan - falling back to the repo-global path, then the default. */
export function contractsPath(app?: string | null): string {
  try {
    const c = loadConfig();
    if (app && c.contracts_path_apps?.[app]) return c.contracts_path_apps[app];
    return c.contracts_path ?? 'src/contracts';
  }
  catch { return 'src/contracts'; }
}

export const stateP = path.join(AEGIS_DIR, 'state.json');
export const transP = path.join(AEGIS_DIR, 'transitions.json');
export const configP = path.join(AEGIS_DIR, 'config.json');

function loadJsonOr<T>(p: string, what: string): T {
  if (!fs.existsSync(p)) die(2, `missing ${what} - run aegis init`);
  try { return readJ<T>(p); }
  catch { die(2, `corrupt ${what} - fix it, restore from a checkpoint, or re-run aegis init`); }
}

export function loadStateFrom(p: string): State {
  const s = loadJsonOr<State>(p, path.relative(AEGIS_DIR, p));
  if (s.schema_version !== SCHEMA_VERSION)
    die(12, `state schema v${s.schema_version} != CLI v${SCHEMA_VERSION} - run aegis migrate`);
  return s;
}
export function loadState(): State {
  return loadStateFrom(stateP);
}
export const loadTransitions = (): Transitions =>
  validateTransitions(loadJsonOr<Transitions>(transP, '.aegis/transitions.json'));
export const loadConfig = (): Config => loadJsonOr<Config>(configP, '.aegis/config.json');

/** Initial pipeline state (00a, empty counters). laneMax only meaningful on
 *  the ROOT state - lanes are global (RAM is a machine resource). */
export function freshState(laneMax = 2): State {
  return { schema_version: SCHEMA_VERSION, current_skill: '00a',
    history: [], loop_counters: {}, state_visits: {}, gates: {},
    lanes: { max: laneMax, active: [] }, contracts_merged: false };
}

// ---- v0.4 monorepo: per-app pipeline states ----
// One state machine per git root cannot express "pw-ai mid-validate while web
// is shipped" (BlindFolio trial, their #1 gap). Shape per docs/MONOREPO-DESIGN.md:
// declared apps get .aegis/apps/<name>/state.json; transitions/config/skills
// stay shared; lanes stay global on the root state. Single-app repos are the
// degenerate case - zero behavior change when config.apps is absent.

export const appStatePath = (name: string): string =>
  path.join(AEGIS_DIR, 'apps', name, 'state.json');

export function declaredApps(): string[] {
  try { return loadConfig().apps ?? []; } catch { return []; }
}

/** Remove `--app <value>` from an argv copy (commands that parse free-text
 *  args, e.g. fix start <desc>, call this first). */
export function stripAppArg(args: string[]): string[] {
  const i = args.indexOf('--app');
  return i === -1 ? args : [...args.slice(0, i), ...args.slice(i + 2)];
}

export interface StateCtx { s: State; p: string; app: string | null }

// ---- concurrent-write safety (v0.4.1) ----
// Atomic writeJ prevents TORN files; it does not prevent LOST UPDATES - two
// processes can read the same state, append in memory, and the second write
// silently overwrites the first's event (metis-nda trial: 3/5 concurrent
// `aegis exec` calls recorded). `resume` VERIFIED cannot see a missing event.
// Fix: a lockfile around the whole read-modify-write. Stale locks self-heal:
// a lock whose pid is dead (or older than 60s) is stolen, so a die()/crash
// mid-mutation never wedges the repo.

const sleep = (ms: number): void => {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
};

function acquireLock(p: string): void {
  const lock = `${p}.lock`;
  const deadline = Date.now() + 10_000;
  for (;;) {
    try {
      fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, at: Date.now() }), { flag: 'wx' });
      return;
    } catch (e: any) {
      if (e?.code !== 'EEXIST') throw e;
      let steal = false;
      try {
        const j = JSON.parse(fs.readFileSync(lock, 'utf8'));
        let alive = true;
        try { process.kill(j.pid, 0); } catch { alive = false; }
        steal = !alive || Date.now() - j.at > 60_000;
      } catch { steal = true; } // unparseable lock
      if (steal) { fs.rmSync(lock, { force: true }); continue; }
      if (Date.now() > deadline)
        die(4, `state locked by another aegis process (waited 10s) - retry, or remove ${path.basename(lock)} if that process is gone`);
      sleep(25 + Math.floor(Math.random() * 50)); // jittered backoff
    }
  }
}

/** Lock + load a state file for mutation. Pair with commitState. */
export function acquireState(p: string): State {
  acquireLock(p);
  return loadStateFrom(p);
}

/** Write + unlock. Every mutation path must end here, not bare writeJ. */
export function commitState(p: string, s: State): void {
  try { writeJ(p, s); }
  finally { fs.rmSync(`${p}.lock`, { force: true }); }
}

/** Resolve which state a command operates on. Multi-app repo + mutating
 *  command without --app: refuse (exit 2) and list the apps - never guess.
 *  Mutating resolutions hold the state lock until commitState. */
export function resolveState(args: string[], mutate: boolean): StateCtx {
  const apps = declaredApps();
  if (!apps.length) {
    const s = mutate ? acquireState(stateP) : loadState();
    return { s, p: stateP, app: null };
  }
  const i = args.indexOf('--app');
  const name = i !== -1 ? args[i + 1] : undefined;
  if (!name) {
    if (mutate)
      die(2, `multi-app repo (apps: ${apps.join(', ')}) - pass --app <name>`);
    return { s: loadState(), p: stateP, app: null };
  }
  if (!apps.includes(name))
    die(2, `unknown app '${name}' - declared apps: ${apps.join(', ')}`);
  const p = appStatePath(name);
  if (!fs.existsSync(p))
    die(2, `no state for app '${name}' - re-run: aegis config set apps ${apps.join(',')} (recreates missing app states)`);
  const s = mutate ? acquireState(p) : loadStateFrom(p);
  return { s, p, app: name };
}

const STATE_ID = /^\d{2}[a-z]$/;

/** Startup sanity (warn, never die - drift guard for hand-edited/machine
 *  transitions): edge endpoints must look like state ids (NNx); endpoints with
 *  no skill file under .aegis/skills/ are noted, since advisory states without
 *  a pipeline file are legitimate but typos are not. */
function validateTransitions(t: Transitions): Transitions {
  const skillsDir = path.join(AEGIS_DIR, 'skills');
  const known = new Set<string>();
  if (fs.existsSync(skillsDir)) {
    for (const fam of fs.readdirSync(skillsDir)) {
      const d = path.join(skillsDir, fam);
      if (!fs.statSync(d).isDirectory()) continue;
      for (const f of fs.readdirSync(d)) {
        const m = /^(\d{2}[a-z])-/.exec(f);
        if (m) known.add(m[1]);
      }
    }
  }
  const notes = new Set<string>();
  for (const e of t.edges) {
    for (const id of [e.from, e.to]) {
      if (!STATE_ID.test(id)) notes.add(`edge ${e.from}->${e.to}: '${id}' is not a state id (NNx)`);
      else if (known.size && !known.has(id)) notes.add(`edge ${e.from}->${e.to}: no skill file for ${id}`);
    }
  }
  for (const n of notes) console.error(`note: transitions.json: ${n}`);
  return t;
}
