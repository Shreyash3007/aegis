import fs from 'node:fs';
import path from 'node:path';
import { AEGIS_DIR, die, readJ } from './util.js';

export const SCHEMA_VERSION = 1;

export interface GateRecord { status: 'approved'; at: string; by: string }
export interface State {
  schema_version: number;
  current_skill: string;
  history: { skill: string; at: string }[];
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
}

export const stateP = path.join(AEGIS_DIR, 'state.json');
export const transP = path.join(AEGIS_DIR, 'transitions.json');
export const configP = path.join(AEGIS_DIR, 'config.json');

export function loadState(): State {
  if (!fs.existsSync(stateP)) die(2, 'No .aegis/state.json - run aegis init first');
  const s = readJ<State>(stateP);
  if (s.schema_version !== SCHEMA_VERSION)
    die(12, `state schema v${s.schema_version} != CLI v${SCHEMA_VERSION} - run aegis migrate`);
  return s;
}
export const loadTransitions = (): Transitions => readJ<Transitions>(transP);
export const loadConfig = (): Config => readJ<Config>(configP);
