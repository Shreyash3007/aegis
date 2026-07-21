import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, execSync } from 'node:child_process';
export function die(code, msg) {
    console.error(`FAIL ${msg}`);
    process.exit(code);
}
/** Repo root: walk up from cwd to the nearest dir containing .git (dir OR
 *  file - linked worktrees have a .git file). Slice worktrees live OUTSIDE the
 *  repo in a sibling dir, so running from one resolves to that worktree root. */
function findRepoRoot(start) {
    let dir = path.resolve(start);
    for (;;) {
        if (fs.existsSync(path.join(dir, '.git')))
            return dir;
        const parent = path.dirname(dir);
        if (parent === dir)
            return null;
        dir = parent;
    }
}
const repoRoot = findRepoRoot(process.cwd());
if (!repoRoot)
    die(1, `not a git repo (no .git found at or above ${process.cwd()})`);
export const REPO = repoRoot;
export const AEGIS_DIR = path.join(REPO, '.aegis');
export const ok = (msg) => console.log(`OK ${msg}`);
export const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
export const readJ = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
export const writeJ = (p, o) => fs.writeFileSync(p, JSON.stringify(o, null, 2) + '\n');
/** git helper - argv array, NO shell: branch/slice names are user input and
 *  must never be interpolated into a shell string. Trims output.
 *  Never use for content comparison (A1.1). */
export const git = (args, cwd = REPO) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
/** git helper - raw output, for diffs and content-level checks only. */
export const gitRaw = (args, cwd = REPO) => execFileSync('git', args, { cwd, encoding: 'utf8' });
export const has = (bin) => {
    try {
        execSync(`command -v ${bin}`, { stdio: 'pipe' });
        return true;
    }
    catch {
        return false;
    }
};
