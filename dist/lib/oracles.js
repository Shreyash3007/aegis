import fs from 'node:fs';
import path from 'node:path';
import { REPO, has } from './util.js';
/** Detect a repo's primary stack from marker files. First match wins in a fixed
 *  priority order; a polyglot repo is reported as its highest-priority marker so
 *  the typecheck oracle picks ONE checker rather than guessing. Absent all
 *  markers -> 'unknown' (the caller degrades honestly to UNMEASURED). */
export function detectStack(cwd = REPO) {
    const markers = [
        ['tsconfig.json', 'typescript'],
        ['package.json', 'typescript'],
        ['Cargo.toml', 'rust'],
        ['go.mod', 'go'],
        ['pyproject.toml', 'python'],
        ['setup.py', 'python'],
        ['requirements.txt', 'python'],
    ];
    for (const [file, stack] of markers) {
        if (fs.existsSync(path.join(cwd, file)))
            return stack;
    }
    return 'unknown';
}
/** The command string to typecheck the repo per stack, or null when the
 *  toolchain is honestly unavailable. null means UNMEASURED - never fake a pass,
 *  never hard-fail because the wrong toolchain is missing. The typescript path
 *  prefers the repo's local tsc (so the right version/types resolve) and falls
 *  back to a global tsc; other stacks use their native checker if present. */
export function typecheckCommand(cwd = REPO) {
    switch (detectStack(cwd)) {
        case 'typescript': {
            const localBin = path.join(cwd, 'node_modules', '.bin', 'tsc');
            if (fs.existsSync(localBin))
                return `"${localBin}" --noEmit`;
            return has('tsc') ? 'tsc --noEmit' : null;
        }
        case 'rust':
            return has('cargo') ? 'cargo check' : null;
        case 'go':
            return has('go') ? 'go vet ./...' : null;
        case 'python':
            return has('python3') ? 'python3 -m compileall -q .' : null;
        default:
            return null;
    }
}
