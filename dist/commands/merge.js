import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { REPO, die, git, gitRaw, ok } from '../lib/util.js';
import { contractsPath } from '../lib/state.js';
/** aegis merge check <branch> - the merge oracle (N3, simulation-proven).
 *  Real git merge in an OS-temp worktree (A1.5), tsc, contract immutability
 *  via git-native diff (A1.1). Exit 9 = refused. Exit 13 = nothing to merge
 *  (never reported as PASS, A1.6). */
export function merge(args) {
    if (args[0] !== 'check' || !args[1])
        die(2, 'usage: aegis merge check <branch>');
    const branch = args[1];
    let branchSha;
    try {
        branchSha = git(['rev-parse', branch]);
    }
    catch {
        die(2, `unknown branch: ${branch}`);
    }
    const baseSha = git(['rev-parse', 'HEAD']);
    if (branchSha === baseSha) {
        console.log('NOTHING TO MERGE: branch tip == base tip. This is NOT a pass (A1.6).');
        process.exit(13);
    }
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-merge-'));
    const cleanup = () => {
        try {
            // worktrees keep git metadata in the real gitdir (the .git FILE at the
            // worktree root points there) - resolve it before probing for MERGE_HEAD
            const gitDir = git(['rev-parse', '--git-dir'], tmp);
            if (fs.existsSync(path.resolve(tmp, gitDir, 'MERGE_HEAD')))
                git(['merge', '--abort'], tmp);
            git(['worktree', 'remove', tmp, '--force']);
        }
        catch { /* best effort */ }
        try {
            fs.rmSync(tmp, { recursive: true, force: true });
        }
        catch { /* best effort */ }
        try {
            git(['worktree', 'prune']);
        }
        catch { /* best effort */ }
    };
    try {
        git(['worktree', 'prune']);
        git(['worktree', 'add', tmp, 'HEAD']);
    }
    catch {
        cleanup();
        die(9, `failed to create merge-test worktree`);
    }
    try {
        git(['merge', '--no-commit', '--no-ff', branch], tmp);
    }
    catch {
        cleanup();
        die(9, `MERGE CONFLICT in ${branch} - text conflicts need LLM resolution with compiler context`);
    }
    const failed = [];
    // worktrees have no node_modules (gitignored): link the main repo's so the
    // typecheck oracle resolves real deps instead of false-refusing with TS2307
    const nm = path.join(REPO, 'node_modules');
    if (fs.existsSync(nm) && !fs.existsSync(path.join(tmp, 'node_modules'))) {
        try {
            fs.symlinkSync(nm, path.join(tmp, 'node_modules'), 'junction');
        }
        catch { /* different layout or fs restriction - oracle degrades honestly below */ }
    }
    // oracle 1: typecheck (degrade honestly if tsc unavailable)
    const hasLocalTsc = fs.existsSync(path.join(REPO, 'node_modules', '.bin', 'tsc'));
    if (hasLocalTsc) {
        try {
            execFileSync(path.join(REPO, 'node_modules', '.bin', 'tsc'), ['--noEmit', '-p', tmp], { stdio: 'pipe', encoding: 'utf8' });
        }
        catch (e) {
            const out = [e.stdout, e.stderr].filter(Boolean).join('\n') || e.message;
            failed.push('tsc --noEmit FAILED:\n' + String(out).split('\n').slice(0, 12).join('\n'));
        }
    }
    else {
        console.log('warn: tsc unavailable in target repo - typecheck oracle UNVERIFIED (advisory)');
    }
    // oracle 2: contract immutability (git-native diff, A1.1)
    const drift = gitRaw(['diff', '--name-only', 'HEAD', '--', contractsPath()], tmp).trim();
    if (drift)
        failed.push(`CONTRACT DRIFT: slice modified immutable contracts (N1):\n  ${drift.split('\n').join('\n  ')}`);
    cleanup();
    if (failed.length)
        die(9, `MERGE ORACLE REFUSED ${branch}:\n${failed.join('\n')}`);
    ok(`merge oracle PASSED ${branch} (tsc ${hasLocalTsc ? 'clean' : 'UNVERIFIED'}, contracts intact)`);
}
