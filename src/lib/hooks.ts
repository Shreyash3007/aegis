import fs from 'node:fs';
import path from 'node:path';
import { REPO } from './util.js';

const HOOKS: Record<string, string> = {
  'pre-commit': `#!/bin/sh
# AEGIS pre-commit: checkpoint must succeed; typecheck if TS project
if command -v aegis >/dev/null 2>&1; then A=aegis;\nelif [ -f "__CLIPATH__" ]; then A="node __CLIPATH__";\nelse A="npx --yes aegis"; fi
COMMON=$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null)
MAIN=$(dirname "$COMMON")
# checkpoint runs against MAIN repo state (.aegis lives there, not in slice worktrees)
(cd "$MAIN" && $A checkpoint --quiet) || { echo "aegis: checkpoint failed"; exit 1; }
if [ -f tsconfig.json ]; then
  if npx --no-install tsc --version >/dev/null 2>&1; then
    npx --no-install tsc --noEmit || { echo "aegis: tsc failed"; exit 1; }
  elif command -v tsc >/dev/null 2>&1; then
    tsc --noEmit || { echo "aegis: tsc failed"; exit 1; }
  else
    echo "aegis: tsc unavailable - typecheck skipped (advisory; install typescript to enforce)"
  fi
fi
`,
  'post-commit': `#!/bin/sh
# AEGIS post-commit: record checkpoint with new HEAD
if command -v aegis >/dev/null 2>&1; then A=aegis;\nelif [ -f "__CLIPATH__" ]; then A="node __CLIPATH__";\nelse A="npx --yes aegis"; fi
COMMON=$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null)
MAIN=$(dirname "$COMMON")
(cd "$MAIN" && $A checkpoint --quiet) || true
`,
  'pre-push': `#!/bin/sh
# AEGIS pre-push: contract validation
if command -v aegis >/dev/null 2>&1; then A=aegis;\nelif [ -f "__CLIPATH__" ]; then A="node __CLIPATH__";\nelse A="npx --yes aegis"; fi
$A validate contracts || exit 1
`,
};

export function installHooks(): string[] {
  const dir = path.join(REPO, '.git', 'hooks');
  const cliPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
  const installed: string[] = [];
  for (const [name, script] of Object.entries(HOOKS)) {
    const p = path.join(dir, name);
    fs.writeFileSync(p, script.replaceAll('__CLIPATH__', cliPath));
    fs.chmodSync(p, 0o755);
    installed.push(name);
  }
  return installed;
}
