import fs from 'node:fs';
import path from 'node:path';
import { REPO } from './util.js';

// Every Aegis hook starts with this marker so re-init can tell "our hook"
// (safe to overwrite/upgrade) from a pre-existing foreign hook (must be
// preserved and chained, never clobbered - brownfield repos often already
// have husky/lefthook/pre-commit-framework hooks installed).
// Matches both the current `# AEGIS MANAGED HOOK` banner and the v0.2.0
// `# AEGIS <name>: ...` banner, so re-init after an upgrade treats old
// Aegis hooks as ours (overwrite) rather than foreign (move aside + chain).
const MARKER = '# AEGIS';

// Chain block: if a pre-existing hook was moved aside at init, run it first.
// $0 is the hook path git invoked; the orig lives next to it. Blocking hooks
// (pre-commit, pre-push) propagate the orig's failure; post-commit is
// advisory. stdin flows through untouched, so pre-push ref listings reach
// the orig hook unmodified.
const CHAIN = (blocking: boolean): string => `ORIG="$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null)/hooks/$(basename "$0").aegis-orig"
if [ -x "$ORIG" ]; then "$ORIG" "$@" || { echo "aegis: pre-existing hook failed"; ${blocking ? 'exit 1' : 'true'}; }; fi
`;

// CLI resolution: PATH first, then the install path baked at init time.
// There is deliberately NO `npx aegis` fallback - aegis is not on the npm
// registry (GitHub install only), so npx can never work and would fail with
// a misleading 404. Fail loud instead.
const RESOLVE = `if command -v aegis >/dev/null 2>&1; then A=aegis;
elif [ -f "__CLIPATH__" ]; then A="node __CLIPATH__";
else echo "aegis: CLI not found on PATH and baked install path is stale - reinstall aegis or re-run: aegis init --overwrite" >&2; exit 1; fi
`;

const HOOKS: Record<string, string> = {
  'pre-commit': `#!/bin/sh
${MARKER}: checkpoint must succeed; typecheck if TS project
${CHAIN(true)}${RESOLVE}COMMON=$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null)
MAIN=$(dirname "$COMMON")
# checkpoint runs against MAIN repo state (.aegis lives there, not in slice worktrees)
(cd "$MAIN" && $A checkpoint --quiet) || { echo "aegis: checkpoint failed"; exit 1; }
if [ -f tsconfig.json ]; then
  if git ls-files | grep -qE '\\.tsx?$'; then
    if npx --no-install tsc --version >/dev/null 2>&1; then
      npx --no-install tsc --noEmit || { echo "aegis: tsc failed"; exit 1; }
    elif command -v tsc >/dev/null 2>&1; then
      tsc --noEmit || { echo "aegis: tsc failed"; exit 1; }
    else
      echo "aegis: tsc unavailable - typecheck skipped (advisory; install typescript to enforce)"
    fi
  else
    echo "aegis: no TypeScript files yet - typecheck skipped"
  fi
fi
`,
  'post-commit': `#!/bin/sh
${MARKER}: record checkpoint with new HEAD
${CHAIN(false)}if command -v aegis >/dev/null 2>&1; then A=aegis;
elif [ -f "__CLIPATH__" ]; then A="node __CLIPATH__";
else echo "aegis: CLI not found - post-commit checkpoint skipped (reinstall aegis or re-run: aegis init --overwrite)" >&2; exit 0; fi
COMMON=$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null)
MAIN=$(dirname "$COMMON")
(cd "$MAIN" && $A checkpoint --quiet) || true
`,
  'pre-push': `#!/bin/sh
${MARKER}: contract validation
${CHAIN(true)}${RESOLVE}$A validate contracts || exit 1
`,
};

export function installHooks(): string[] {
  const dir = path.join(REPO, '.git', 'hooks');
  const cliPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
  const installed: string[] = [];
  for (const [name, script] of Object.entries(HOOKS)) {
    const p = path.join(dir, name);
    // Preserve a foreign pre-existing hook: move it aside exactly once and
    // let the Aegis hook chain into it. Our own hooks (marker present) are
    // simply overwritten - that is the re-init upgrade path.
    if (fs.existsSync(p) && !fs.readFileSync(p, 'utf8').includes(MARKER)) {
      const orig = `${p}.aegis-orig`;
      if (!fs.existsSync(orig)) fs.renameSync(p, orig);
    }
    fs.writeFileSync(p, script.replaceAll('__CLIPATH__', cliPath));
    fs.chmodSync(p, 0o755);
    installed.push(name);
  }
  return installed;
}
