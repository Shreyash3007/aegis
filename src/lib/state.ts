import fs from 'node:fs';
import path from 'node:path';
import { AEGIS_DIR, die, readJ } from './util.js';

export const SCHEMA_VERSION = 1;

export interface GateRecord { status: 'approved'; at: string; by: string }
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
  token_budget?: number; // advisory only (06d) - surfaced in `aegis status`, never enforced
}

export const stateP = path.join(AEGIS_DIR, 'state.json');
export const transP = path.join(AEGIS_DIR, 'transitions.json');
export const configP = path.join(AEGIS_DIR, 'config.json');

function loadJsonOr<T>(p: string, what: string): T {
  if (!fs.existsSync(p)) die(2, `missing ${what} - run aegis init`);
  try { return readJ<T>(p); }
  catch { die(2, `corrupt ${what} - fix it, restore from a checkpoint, or re-run aegis init`); }
}

export function loadState(): State {
  const s = loadJsonOr<State>(stateP, '.aegis/state.json');
  if (s.schema_version !== SCHEMA_VERSION)
    die(12, `state schema v${s.schema_version} != CLI v${SCHEMA_VERSION} - run aegis migrate`);
  return s;
}
export const loadTransitions = (): Transitions =>
  validateTransitions(loadJsonOr<Transitions>(transP, '.aegis/transitions.json'));
export const loadConfig = (): Config => loadJsonOr<Config>(configP, '.aegis/config.json');

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
