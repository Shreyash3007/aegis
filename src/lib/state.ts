import fs from 'node:fs';
import path from 'node:path';
import { AEGIS_DIR, die, readJ } from './util.js';

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
  apps?: string[]; // v0.4 monorepo: per-app pipeline states under .aegis/apps/
}

/** Where N1 contracts live in this repo (default src/contracts; BlindFolio
 *  trial: real projects keep them elsewhere, and a hardcoded path meant the
 *  N1 gate never fired there). */
export function contractsPath(): string {
  try { return loadConfig().contracts_path ?? 'src/contracts'; }
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

/** Resolve which state a command operates on. Multi-app repo + mutating
 *  command without --app: refuse (exit 2) and list the apps - never guess. */
export function resolveState(args: string[], mutate: boolean): StateCtx {
  const apps = declaredApps();
  if (!apps.length) return { s: loadState(), p: stateP, app: null };
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
  return { s: loadStateFrom(p), p, app: name };
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
