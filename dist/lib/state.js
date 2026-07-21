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
export const loadTransitions = () => validateTransitions(loadJsonOr(transP, '.aegis/transitions.json'));
export const loadConfig = () => loadJsonOr(configP, '.aegis/config.json');
const STATE_ID = /^\d{2}[a-z]$/;
/** Startup sanity (warn, never die - drift guard for hand-edited/machine
 *  transitions): edge endpoints must look like state ids (NNx); endpoints with
 *  no skill file under .aegis/skills/ are noted, since advisory states without
 *  a pipeline file are legitimate but typos are not. */
function validateTransitions(t) {
    const skillsDir = path.join(AEGIS_DIR, 'skills');
    const known = new Set();
    if (fs.existsSync(skillsDir)) {
        for (const fam of fs.readdirSync(skillsDir)) {
            const d = path.join(skillsDir, fam);
            if (!fs.statSync(d).isDirectory())
                continue;
            for (const f of fs.readdirSync(d)) {
                const m = /^(\d{2}[a-z])-/.exec(f);
                if (m)
                    known.add(m[1]);
            }
        }
    }
    const notes = new Set();
    for (const e of t.edges) {
        for (const id of [e.from, e.to]) {
            if (!STATE_ID.test(id))
                notes.add(`edge ${e.from}->${e.to}: '${id}' is not a state id (NNx)`);
            else if (known.size && !known.has(id))
                notes.add(`edge ${e.from}->${e.to}: no skill file for ${id}`);
        }
    }
    for (const n of notes)
        console.error(`note: transitions.json: ${n}`);
    return t;
}
