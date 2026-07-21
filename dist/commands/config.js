import fs from 'node:fs';
import { die, ok, readJ, writeJ } from '../lib/util.js';
import { configP } from '../lib/state.js';
/** Settable keys = the 00b interview's canonical keys (src/lib/interview.ts)
 *  plus operational knobs. Each entry validates and mutates cfg. */
const SETTABLE = {
    platform: (c, v) => { c.platform = v; },
    mode: (c, v) => { c.mode = v === 'manual' ? 'manual' : 'runtime'; },
    autonomy: (c, v) => { if (!['assisted', 'semi', 'full'].includes(v))
        die(4, 'autonomy: assisted|semi|full'); c.autonomy = v; },
    environment_level: (c, v) => { if (!['L0', 'L1', 'L2'].includes(v))
        die(4, 'level: L0|L1|L2'); c.environment_level = v; },
    project_type: (c, v) => { c.project_type = v === 'brownfield' ? 'brownfield' : 'greenfield'; },
    stack: (c, v) => { c.stack = v; },
    team: (c, v) => { if (!['solo', 'small-team'].includes(v))
        die(4, 'team: solo|small-team'); c.team = v; },
    model_strong: (c, v) => {
        const mt = (c.model_tiers ?? { strong: 'default', standard: 'default', light: 'default' });
        mt.strong = v;
        c.model_tiers = mt;
    },
    human_lane_cap: (c, v) => { c.human_lane_cap = Math.max(1, parseInt(v, 10) || 2); },
    ship_profile: (c, v) => { c.ship_profile = v === 'prototype' ? 'prototype' : 'production'; },
    pii_logs: (c, v) => { c.pii_logs = v === 'true'; },
    token_budget: (c, v) => {
        const n = parseInt(v, 10);
        if (!Number.isFinite(n) || n <= 0)
            die(4, 'token_budget: positive integer (advisory, not enforced)');
        c.token_budget = n;
    },
};
/** aegis config            -> print config
 *  aegis config set k v    -> update one key (agent-driven setup, 00b)
 *  aegis config set validate_suite.<name> "<cmd>" -> owner-declared custom
 *    validator, runnable via `aegis validate <name>` (value '-' removes it) */
export function config(args) {
    if (!fs.existsSync(configP))
        die(2, 'no config - run aegis init first');
    const cfg = readJ(configP);
    if (args[0] === 'set') {
        const [key, value] = [args[1], args[2]];
        if (!key || value === undefined)
            die(4, `unknown key '${key}' - valid keys: ${Object.keys(SETTABLE).join(', ')}, validate_suite.<name>`);
        if (key.startsWith('validate_suite.')) {
            const name = key.slice('validate_suite.'.length);
            if (!/^[a-z][a-z0-9_]*$/.test(name))
                die(4, `validate_suite name '${name}': lowercase letters/digits/underscore, starting with a letter`);
            if (['contracts', 'tests', 'deps', 'perf', 'e2e'].includes(name))
                die(4, `validate_suite.${name} collides with a builtin suite - choose another name`);
            const vs = (cfg.validate_suites ?? {});
            if (value === '-')
                delete vs[name];
            else
                vs[name] = value;
            cfg.validate_suites = vs;
            writeJ(configP, cfg);
            ok(value === '-' ? `config: validate_suites.${name} removed`
                : `config: validate_suites.${name} = ${JSON.stringify(value)} (run: aegis validate ${name})`);
            return;
        }
        if (!SETTABLE[key])
            die(4, `unknown key '${key}' - valid keys: ${Object.keys(SETTABLE).join(', ')}, validate_suite.<name>`);
        SETTABLE[key](cfg, value);
        writeJ(configP, cfg);
        ok(`config: ${key} = ${JSON.stringify(key === 'model_strong' ? cfg.model_tiers.strong : cfg[key])}`);
    }
    else {
        console.log(JSON.stringify(cfg, null, 2));
    }
}
