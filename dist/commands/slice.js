import fs from 'node:fs';
import path from 'node:path';
import { REPO, die, git, ok, writeJ } from '../lib/util.js';
import { loadState, stateP } from '../lib/state.js';
/** aegis slice <create|list|remove> <name> - worktree-per-slice (N2).
 *  Worktrees live OUTSIDE the repo (A1.5). Registered in state.json (A1.6). */
const wtRoot = () => path.resolve(REPO, '..', `${path.basename(REPO)}-worktrees`);
export function slice(args) {
    const [op, name] = args;
    const s = loadState();
    s.slices = s.slices ?? {};
    if (op === 'create') {
        if (!name)
            die(4, 'usage: aegis slice create <name>');
        if (s.lanes.active.length >= s.lanes.max)
            die(4, `LANE CAP: ${s.lanes.active.length}/${s.lanes.max} - refuses to spawn (N5)`);
        const dir = path.join(wtRoot(), name);
        const branch = `aegis/slice-${name}`;
        fs.mkdirSync(wtRoot(), { recursive: true });
        try {
            git(['worktree', 'add', dir, '-b', branch]);
        }
        catch (e) {
            die(4, `worktree create failed: ${String(e.message).split('\n')[0]}`);
        }
        s.slices[name] = { dir, branch, created: new Date().toISOString() };
        s.lanes.active.push(name);
        writeJ(stateP, s);
        ok(`slice ${name}: worktree ${dir} on ${branch} (lane ${s.lanes.active.length}/${s.lanes.max})`);
    }
    else if (op === 'list') {
        const entries = Object.entries(s.slices);
        if (!entries.length) {
            console.log('no slices registered');
            return;
        }
        for (const [n, meta] of entries) {
            const alive = fs.existsSync(path.join(meta.dir, '.git'));
            console.log(`${alive ? 'live ' : 'STALE'} ${n} -> ${meta.branch} @ ${meta.dir}`);
        }
    }
    else if (op === 'remove') {
        const meta = s.slices?.[name];
        if (!meta)
            die(2, `unknown slice: ${name}`);
        try {
            git(['worktree', 'remove', meta.dir, '--force']);
        }
        catch { /* may be gone */ }
        delete s.slices[name];
        s.lanes.active = s.lanes.active.filter((x) => x !== name);
        writeJ(stateP, s);
        ok(`slice ${name} removed, lane closed`);
    }
    else
        die(4, 'usage: aegis slice <create|list|remove> <name>');
}
