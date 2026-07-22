import { die, git, gitTry, ok } from '../lib/util.js';
import { resolveState, stripAppArg, commitState } from '../lib/state.js';
import { checkpoint } from './persist.js';
import { runSuite } from './validate.js';
/** Fast lane (v0.3): the pipeline has exactly one change size (PRD -> gates ->
 *  contracts -> slices -> ship), which prices a typo fix the same as a new
 *  feature. The fix/chore track is the honest alternative: the pipeline state
 *  (current_skill) is NOT touched, the change is recorded with its class, and
 *  `fix done` still requires the tests suite to pass (or honestly report
 *  UNMEASURED). Enforcement = recorded, sized gates - not uniform gates.
 *  Abuse (a "fix" that is really a feature) stays visible in the log.
 *  v0.4: app-scoped in multi-app repos (--app required, like all mutations). */
function open(ctx, rec) {
    const s = ctx.s;
    s.fix ??= { active: null, log: [] };
    if (s.fix.active)
        die(4, `fix already open: "${s.fix.active.desc}" - run aegis fix done / abandon first`);
    s.fix.active = rec;
    s.history.push({ skill: s.current_skill, at: rec.opened_at, event: `fix-start: ${rec.desc}` });
    commitState(ctx.p, s);
    checkpoint(['--quiet']);
    ok(`fix open${ctx.app ? ` (app ${ctx.app})` : ''}: "${rec.desc}" - work, then: aegis fix done`);
}
export function fix(args) {
    const a = stripAppArg(args);
    const sub = a[0];
    if (sub === 'start') {
        const desc = a.slice(1).join(' ').trim();
        if (!desc)
            die(2, 'usage: aegis fix start <description> [--app <name>]');
        open(resolveState(args, true), { kind: 'fix', desc, opened_at: new Date().toISOString() });
        return;
    }
    if (sub === 'done')
        return done(args);
    if (sub === 'abandon') {
        const ctx = resolveState(args, true);
        const s = ctx.s;
        if (!s.fix?.active)
            die(4, 'no open fix');
        const ri = a.indexOf('--reason');
        const reason = ri !== -1 ? a[ri + 1] : undefined;
        if (!reason)
            die(4, 'fix abandon requires --reason <text> (audited)');
        const rec = s.fix.active;
        rec.closed_at = new Date().toISOString();
        rec.abandoned_reason = reason;
        s.fix.log.push(rec);
        s.fix.active = null;
        s.history.push({ skill: s.current_skill, at: rec.closed_at, event: 'fix-abandon', reason });
        commitState(ctx.p, s);
        checkpoint(['--quiet']);
        ok(`fix abandoned (recorded): ${reason}`);
        return;
    }
    die(2, 'usage: aegis fix <start <desc>|done|abandon --reason t> [--app <name>]');
}
async function done(args) {
    const ctx = resolveState(args, true);
    const s = ctx.s;
    if (!s.fix?.active)
        die(4, 'no open fix - start one: aegis fix start <desc>');
    const rec = s.fix.active;
    // The one gate the fast lane keeps: the test suite must not be red.
    // UNMEASURED (no test script) closes honestly and says so in the record.
    const r = await runSuite('tests');
    const verdict = r ? `${r.status} (${r.command})` : 'UNMEASURED (tests suite unavailable)';
    if (r?.status === 'FAIL')
        die(9, `fix NOT closed - tests FAIL: ${r.summary}\n  fix stays open; repair, then aegis fix done again`);
    rec.closed_at = new Date().toISOString();
    rec.validation = verdict;
    s.fix.log.push(rec);
    s.fix.active = null;
    s.history.push({ skill: s.current_skill, at: rec.closed_at, event: `fix-done: ${rec.desc} [${verdict}]` });
    commitState(ctx.p, s);
    checkpoint(['--quiet']);
    ok(`fix closed: "${rec.desc}" - validation: ${verdict}`);
    // Guardrail (BlindFolio trial): the fast lane gates tests, not merges. A
    // fix closed on a branch has no merge oracle in its path - say so.
    try {
        const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
        let base = gitTry(['rev-parse', '--abbrev-ref', 'origin/HEAD']).replace(/^origin\//, '');
        if (!base)
            base = gitTry(['rev-parse', '--verify', 'main']) ? 'main' : 'master';
        if (branch !== 'HEAD' && branch !== base)
            console.log(`note: fix closed on branch '${branch}' (base: ${base}) - the fast lane does not gate merges; run \`aegis merge check ${branch}\` before merging`);
    }
    catch { /* detached/pre-branch - nothing to compare */ }
}
/** Chores (docs/config/rename-class changes): single command, no lifecycle,
 *  no validation - checkpoint + record. */
export function chore(args) {
    const desc = stripAppArg(args).join(' ').trim();
    if (!desc)
        die(2, 'usage: aegis chore <description> [--app <name>]');
    const ctx = resolveState(args, true);
    const s = ctx.s;
    const at = new Date().toISOString();
    const rec = { kind: 'chore', desc, opened_at: at, closed_at: at, validation: 'not required (chore class)' };
    s.fix ??= { active: null, log: [] };
    s.fix.log.push(rec);
    s.history.push({ skill: s.current_skill, at, event: `chore: ${desc}` });
    commitState(ctx.p, s);
    checkpoint(['--quiet']);
    ok(`chore recorded${ctx.app ? ` (app ${ctx.app})` : ''}: "${desc}"`);
}
