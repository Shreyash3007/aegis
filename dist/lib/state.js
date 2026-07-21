import fs from 'node:fs';
import path from 'node:path';
import { AEGIS_DIR, die, readJ } from './util.js';
export const SCHEMA_VERSION = 1;
export const stateP = path.join(AEGIS_DIR, 'state.json');
export const transP = path.join(AEGIS_DIR, 'transitions.json');
export const configP = path.join(AEGIS_DIR, 'config.json');
function loadJsonOr(p, what) {
    if (!fs.existsSync(p))
        die(2, `missing ${what} - run aegis init`);
    try {
        return readJ(p);
    }
    catch {
        die(2, `corrupt ${what} - fix it, restore from a checkpoint, or re-run aegis init`);
    }
}
export function loadState() {
    const s = loadJsonOr(stateP, '.aegis/state.json');
    if (s.schema_version !== SCHEMA_VERSION)
        die(12, `state schema v${s.schema_version} != CLI v${SCHEMA_VERSION} - run aegis migrate`);
    return s;
}
export const loadTransitions = () => loadJsonOr(transP, '.aegis/transitions.json');
export const loadConfig = () => loadJsonOr(configP, '.aegis/config.json');
