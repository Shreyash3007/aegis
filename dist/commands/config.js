import fs from 'node:fs';
import { die, ok, readJ, writeJ } from '../lib/util.js';
import { configP } from '../lib/state.js';
const SETTABLE = {
    platform: (v) => v,
    mode: (v) => (v === 'manual' ? 'manual' : 'runtime'),
    autonomy: (v) => { if (!['assisted', 'semi', 'full'].includes(v))
        die(4, 'autonomy: assisted|semi|full'); return v; },
    environment_level: (v) => { if (!['L0', 'L1', 'L2'].includes(v))
        die(4, 'level: L0|L1|L2'); return v; },
    project_type: (v) => (v === 'brownfield' ? 'brownfield' : 'greenfield'),
    human_lane_cap: (v) => Math.max(1, parseInt(v, 10) || 2),
    ship_profile: (v) => (v === 'prototype' ? 'prototype' : 'production'),
    pii_logs: (v) => v === 'true',
    token_budget: (v) => {
        const n = parseInt(v, 10);
        if (!Number.isFinite(n) || n <= 0)
            die(4, 'token_budget: positive integer (advisory, not enforced)');
        return n;
    },
};
/** aegis config            -> print config
 *  aegis config set k v    -> update one key (agent-driven setup, 00b) */
export function config(args) {
    if (!fs.existsSync(configP))
        die(2, 'no config - run aegis init first');
    const cfg = readJ(configP);
    if (args[0] === 'set') {
        const [key, value] = [args[1], args[2]];
        if (!key || value === undefined || !SETTABLE[key])
            die(4, `usage: aegis config set <${Object.keys(SETTABLE).join('|')}> <value>`);
        cfg[key] = SETTABLE[key](value);
        writeJ(configP, cfg);
        ok(`config: ${key} = ${JSON.stringify(cfg[key])}`);
    }
    else {
        console.log(JSON.stringify(cfg, null, 2));
    }
}
