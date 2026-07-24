import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { REPO, die, ok } from '../lib/util.js';
import { detectStack, typecheckCommand } from '../lib/oracles.js';
/** aegis typecheck - run the repo's REAL typechecker, or degrade honestly.
 *  Today every other oracle assumed tsc; on a Go/Rust/Python repo that fakes a
 *  pass (wrong checker) or hard-fails (missing toolchain). This command uses the
 *  stack's native checker via typecheckCommand:
 *    PASS      -> exit 0, the command cited
 *    FAIL      -> exit 9, first lines of compiler output
 *    null      -> exit 0, an honest UNMEASURED line naming the stack + cause
 *  Never fakes a pass; never hard-fails for a missing foreign toolchain. */
const SRC_EXT = {
    typescript: /\.tsx?$/, go: /\.go$/, rust: /\.rs$/, python: /\.py$/,
};
// Heavy/irrelevant dirs skipped by the source-existence probe (not by tsc).
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.aegis', 'build', '.next', 'target', '.worktrees']);
function hasSource(root, ext) {
    const stack = [root];
    while (stack.length) {
        const d = stack.pop();
        let entries;
        try {
            entries = fs.readdirSync(d);
        }
        catch {
            continue;
        }
        for (const f of entries) {
            const p = path.join(d, f);
            let st;
            try {
                st = fs.statSync(p);
            }
            catch {
                continue;
            }
            if (st.isDirectory()) {
                if (!SKIP_DIRS.has(f))
                    stack.push(p);
            }
            else if (ext.test(f))
                return true;
        }
    }
    return false;
}
export function typecheck(_args) {
    const stack = detectStack();
    const command = typecheckCommand();
    if (!command) {
        const cause = stack === 'unknown'
            ? 'no recognized stack markers (tsconfig.json/package.json/Cargo.toml/go.mod/pyproject.toml)'
            : `${stack} toolchain not found on PATH`;
        ok(`typecheck: UNMEASURED - stack=${stack}, ${cause} (honest skip - tool/env unavailable)`);
        return;
    }
    // Honest "nothing to check": a detected stack with zero source files is
    // UNMEASURED, not a FAIL - tsc would error TS18003 ("No inputs were found"),
    // go vet reports "no Go files", etc. Mirrors the old hook's source guard so a
    // fresh repo (markers present, no code yet) never fails a commit.
    const ext = SRC_EXT[stack];
    if (ext && !hasSource(REPO, ext)) {
        ok(`typecheck: UNMEASURED - stack=${stack}, no ${stack} source files to typecheck (honest skip - nothing to check yet)`);
        return;
    }
    try {
        execSync(command, { cwd: REPO, encoding: 'utf8', stdio: 'pipe' });
    }
    catch (e) {
        const diag = [e.stdout, e.stderr].filter(Boolean).join('\n') || e.message;
        die(9, `typecheck: FAIL (${command})\n${String(diag).split('\n').slice(0, 12).join('\n')}`);
    }
    ok(`typecheck: PASS (${command}) - clean`);
}
