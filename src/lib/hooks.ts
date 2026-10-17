import fs from 'node:fs';
import path from 'node:path';
import { REPO, git, die } from './util.js';
import { ownedPath } from './owned-path.js';

export const hooksDir = (): string => git(['rev-parse', '--path-format=absolute', '--git-path', 'hooks']);

// Every Aegis hook starts with this marker so re-init can tell "our hook"
// (safe to overwrite/upgrade) from a pre-existing foreign hook (must be
// preserved and chained, never clobbered - brownfield repos often already
// have husky/lefthook/pre-commit-framework hooks installed).
// Matches both the current `# AEGIS MANAGED HOOK` banner and the v0.2.0
// `# AEGIS <name>: ...` banner, so re-init after an upgrade treats old
// Aegis hooks as ours (overwrite) rather than foreign (move aside + chain).
export const MARKER = '# AEGIS';

/** Identity of an Aegis-managed hook: the first non-empty, non-shebang line
 *  starts with `# AEGIS` followed by a non-word boundary (`# AEGIS:`, the
 *  v0.2.0 `# AEGIS <name>:` banner). Our scripts emit the banner right after
 *  the `#!/bin/sh` shebang. A whole-body substring match would claim any
 *  foreign hook that merely *mentions* Aegis in a comment — reproduced as
 *  silent clobbering during install and deletion during uninstall. */
export const isManagedHookBody = (body: string): boolean => {
  const first = (body.split(/\r?\n/).find((l) => l.trim() !== '' && !l.startsWith('#!')) ?? '');
  return /^# AEGIS(?![-\w])/.test(first);
};

// Chain block: if a pre-existing hook was moved aside at init, run it first.
// $0 is the hook path git invoked; the orig lives next to it. Blocking hooks
// (pre-commit, pre-push) propagate the orig's failure; post-commit is
// advisory. stdin flows through untouched, so pre-push ref listings reach
// the orig hook unmodified.
const CHAIN = (blocking: boolean): string => `ORIG="$(dirname "$0")/$(basename "$0").aegis-orig"
if [ -x "$ORIG" ]; then "$ORIG" "$@" || { echo "aegis: pre-existing hook failed"; ${blocking ? 'exit 1' : 'true'}; }; fi
`;

// CLI resolution: PATH first, then the install path baked at init time.
// There is deliberately NO `npx aegis` fallback - aegis is not on the npm
// registry (GitHub install only), so npx can never work and would fail with
// a misleading 404. Fail loud instead.
const RESOLVE = `if command -v aegis >/dev/null 2>&1; then aegis_run() { command aegis "$@"; };
elif [ -f __CLIPATH__ ]; then aegis_run() { node __CLIPATH__ "$@"; };
else echo "aegis: CLI not found on PATH and baked install path is stale - reinstall aegis or re-run: aegis init --overwrite" >&2; exit 1; fi
`;

// Ghost-binary tripwire (v0.5.1): the global aegis can silently point at a
// stale/dead copy (observed repeatedly with parallel agent sessions doing
// npm link). The hook then enforces OLD code and nobody notices. Bake the
// CLI version at install time; on every hook run compare the resolved CLI's
// version. Mismatch -> loud ADVISORY (never blocks a commit/push - the
// enforcement running old-but-working code beats a frozen repo), telling
// the human exactly how to re-resolve.
const VCHECK = `VCUR=$(aegis_run --version 2>/dev/null | awk '{print $2}')
if [ -n "$VCUR" ] && [ "$VCUR" != "__VERSION__" ]; then
  echo "aegis: warning - resolved CLI is v$VCUR but hooks were baked for v__VERSION__ (ghost binary?); repair: aegis hooks (re-resolve) or aegis update" >&2
fi
`;

// Hook strictness profiles (set via `aegis hooks --profile`, persisted in
// config.hooks_profile). The hook CONTENT is identical across profiles except
// the pre-push variant: standard blocks only on contract validation, strict
// ALSO runs `aegis validate tests`. minimal installs ONLY post-commit
// (advisory checkpoint recording, zero blocking).
export type HookProfile = 'minimal' | 'standard' | 'strict';

const PRE_COMMIT = `#!/bin/sh
${MARKER}: checkpoint must succeed; typecheck via aegis (multi-stack, honest UNMEASURED)
${CHAIN(true)}${RESOLVE}${VCHECK}COMMON=$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null)
MAIN=$(dirname "$COMMON")
# checkpoint runs against MAIN repo state (.aegis lives there, not in slice worktrees)
(cd "$MAIN" && aegis_run checkpoint --quiet) || { echo "aegis: checkpoint failed"; exit 1; }
# typecheck the repo's real stack (tsc/go vet/cargo check/compileall) or degrade
# honestly (UNMEASURED) - never fakes a pass, never hard-fails a foreign stack.
aegis_run typecheck || exit 1
`;

const POST_COMMIT = `#!/bin/sh
${MARKER}: record checkpoint with new HEAD
${CHAIN(false)}if command -v aegis >/dev/null 2>&1; then aegis_run() { command aegis "$@"; };
elif [ -f __CLIPATH__ ]; then aegis_run() { node __CLIPATH__ "$@"; };
else echo "aegis: CLI not found - post-commit checkpoint skipped (reinstall aegis or re-run: aegis init --overwrite)" >&2; exit 0; fi
${VCHECK}COMMON=$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null)
MAIN=$(dirname "$COMMON")
(cd "$MAIN" && aegis_run checkpoint --quiet) || true
`;

const PRE_PUSH = `#!/bin/sh
${MARKER}: contract validation
${CHAIN(true)}${RESOLVE}${VCHECK}aegis_run validate contracts || exit 1
`;

// strict: standard pre-push followed by `aegis validate tests` - both must
// pass (each || exit 1) before a push is allowed.
const PRE_PUSH_STRICT = `#!/bin/sh
${MARKER}: contract validation + tests
${CHAIN(true)}${RESOLVE}${VCHECK}aegis_run validate contracts || exit 1
aegis_run validate tests || exit 1
`;

// Canonical hook scripts per name (the STANDARD set). MINIMAL installs only
// post-commit; STRICT swaps pre-push for the tests-enforcing variant. This is
// the universe of hook names Aegis will ever install or remove.
const STD: Record<string, string> = {
  'pre-commit': PRE_COMMIT,
  'post-commit': POST_COMMIT,
  'pre-push': PRE_PUSH,
};

function scriptsFor(profile: HookProfile): Record<string, string> {
  if (profile === 'minimal') return { 'post-commit': POST_COMMIT };
  if (profile === 'strict')
    return { 'pre-commit': PRE_COMMIT, 'post-commit': POST_COMMIT, 'pre-push': PRE_PUSH_STRICT };
  return { ...STD }; // standard
}

/** Names of Aegis-managed hook files currently on disk (marker present).
 *  `aegis hooks` diffs this across a profile switch to report removals. */
export function managedHookNames(): string[] {
  const dir = hooksDir();
  const out: string[] = [];
  for (const name of Object.keys(STD)) {
    const p = path.join(dir, name);
    if (fs.existsSync(p) && isManagedHookBody(fs.readFileSync(p, 'utf8'))) out.push(name);
  }
  return out;
}

/** Install git hooks for a strictness profile. Returns the names installed.
 *  Moving to a LIGHTER profile removes any Aegis-managed hook files the new
 *  profile no longer includes - but ONLY files containing the marker: a
 *  foreign hook at that path (no marker) and every `.aegis-orig` backup are
 *  left untouched. The chain/marker/move-aside semantics are unchanged. */
export function installHooks(profile: HookProfile = 'standard'): string[] {
  const dir = path.resolve(hooksDir());
  const common = path.resolve(git(['rev-parse', '--path-format=absolute', '--git-common-dir']));
  const inside = (root: string): boolean => { const r = path.relative(root, dir); return r !== '..' && !r.startsWith(`..${path.sep}`) && !path.isAbsolute(r); };
  if (!inside(REPO) && !inside(common)) die(4, 'effective hooks directory is outside this repo - integrate Aegis into the owner-managed hooks explicitly');
  ownedPath(inside(REPO) ? REPO : common, dir);
  fs.mkdirSync(dir, { recursive: true });
  const cliPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
  // Bake the installing CLI's version into the hooks (ghost-binary tripwire).
  let version = 'unknown';
  try {
    version = JSON.parse(fs.readFileSync(
      path.resolve(path.dirname(cliPath), '..', 'package.json'), 'utf8')).version ?? 'unknown';
  } catch { /* keep 'unknown' - VCHECK no-ops on empty compare */ }
  const desired = scriptsFor(profile);
  const installed: string[] = [];
  for (const [name, script] of Object.entries(desired)) {
    const p = path.join(dir, name);
    // Never act through a link: writing a symlinked hook would clobber
    // whatever it points at, outside the owned root (reproduced post-release).
    try { if (fs.lstatSync(p).isSymbolicLink()) die(4, `hook file ${name} is a link - Aegis never writes through links; replace or remove it and re-run`); }
    catch (e: any) { if (e?.code !== 'ENOENT') throw e; }
    // Preserve a foreign pre-existing hook: move it aside exactly once and
    // let the Aegis hook chain into it. Our own hooks (managed banner) are
    // simply overwritten - that is the re-init upgrade path. A *second*
    // foreign generation with a backup already present is ambiguous owner
    // work: refuse and name the backup instead of silently destroying it.
    if (fs.existsSync(p) && !isManagedHookBody(fs.readFileSync(p, 'utf8'))) {
      const orig = `${p}.aegis-orig`;
      if (fs.existsSync(orig))
        die(4, `hook ${name} is foreign and a previous backup exists (${path.basename(orig)}) - resolve manually (move the backup aside), then re-run`);
      fs.renameSync(p, orig);
    }
    fs.writeFileSync(p, script
      .replaceAll('__CLIPATH__', `'${cliPath.replaceAll("'", "'\\''")}'`)
      .replaceAll('__VERSION__', version));
    fs.chmodSync(p, 0o755);
    installed.push(name);
  }
  // Lighter profile: drop Aegis-managed hooks absent from the desired set.
  // The marker check guarantees we never delete a foreign hook that replaced
  // ours, and we never touch the `.aegis-orig` backups next to them.
  for (const name of Object.keys(STD)) {
    if (desired[name]) continue;
    const p = path.join(dir, name);
    if (fs.existsSync(p) && isManagedHookBody(fs.readFileSync(p, 'utf8'))) fs.rmSync(p);
  }
  return installed;
}
