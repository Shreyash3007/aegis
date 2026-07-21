import fs from 'node:fs';
import path from 'node:path';
import { AEGIS_DIR, die, readJ } from './util.js';
export const SCHEMA_VERSION = 1;
export const stateP = path.join(AEGIS_DIR, 'state.json');
export const transP = path.join(AEGIS_DIR, 'transitions.json');
export const configP = path.join(AEGIS_DIR, 'config.json');
export function loadState() {
    if (!fs.existsSync(stateP))
        die(2, 'No .aegis/state.json - run aegis init first');
    const s = readJ(stateP);
    if (s.schema_version !== SCHEMA_VERSION)
        die(12, `state schema v${s.schema_version} != CLI v${SCHEMA_VERSION} - run aegis migrate`);
    return s;
}
export const loadTransitions = () => readJ(transP);
export const loadConfig = () => readJ(configP);
