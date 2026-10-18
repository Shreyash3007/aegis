import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { die, ok, writeTextAtomic } from '../lib/util.js';
import { HostCapabilityDeclaration } from '../contracts/hosts.js';
import { declarationProblems } from '../hosts/declarations.js';

/** OpenCode host adapter (v0.11 R3b). Installs exactly one dedicated,
 *  auto-discovered plugin file (.opencode/plugins/aegis.ts) whose only job is
 *  the declaration's read-only `context` binding: on the first context build
 *  of a session the plugin spawns the declared argv directly (no shell) and
 *  pushes the captured stdout into the outgoing system instructions. Security
 *  posture, in order: links refuse (lstat before any mutation); a foreign
 *  aegis.ts is refused, never overwritten or removed - only a byte-canonical
 *  adapter-owned file is touched; ambiguity (a backup without a plugin file)
 *  refuses instead of guessing; uninstall removes the file and prunes only
 *  emptied containers. Adapters never own pipeline state, dispatch agents or
 *  add model routing - the plugin runs the declaration's argv, nothing else. */

const BACKUP_SUFFIX = '.aegis-backup';

/** The canonical plugin source for a declaration argv. The argv pieces are
 *  JSON-encoded so nothing in the plugin text is shell-interpretable, and the
 *  plugin spawns through child_process arguments - never a shell. Bounded at
 *  five seconds with a hidden window; a CLI that is missing or fails logs the
 *  declaration's manual guidance instead of any fallback. */
export function opencodePluginSource(argv: string[]): string {
  const command = argv.join(' ');
  const spawn = `spawnSync(${JSON.stringify(argv[0])}, ${JSON.stringify(argv.slice(1))}, { encoding: "utf8", timeout: 5000, windowsHide: true })`;
  const hint = `aegis: '${command}' did not run - install aegis on PATH or run it manually (manual guidance; no fallback)`;
  return [
    '// AEGIS read-only status binding (v0.11 "Reach"). Installed by',
    '// `aegis host install opencode`; removed by `aegis host uninstall opencode`.',
    '// On the first context build of a session the plugin runs the declared',
    '// command directly (argv, no shell) and pushes the captured stdout into',
    '// the outgoing system instructions. Read-only: no prompt rewriting, no',
    '// tool gating, no fallback daemon - a missing CLI logs manual guidance.',
    'import { Plugin } from "@opencode/plugin"',
    'import { spawnSync } from "node:child_process"',
    '',
    'export default Plugin.define({',
    '  id: "aegis",',
    '  async setup(ctx) {',
    '    const injected = new Set()',
    '    await ctx.session.hook("context", (event) => {',
    '      const key = typeof event.sessionID === "string" && event.sessionID !== "" ? event.sessionID : "session-less"',
    '      if (injected.has(key)) return',
    '      injected.add(key)',
    `      const r = ${spawn}`,
    '      const text = typeof r.stdout === "string" ? r.stdout.trim() : ""',
    '      if (r.status === 0 && text !== "") {',
    '        event.system.push({ type: "text", text })',
    '        console.log("aegis: status context injected (" + text.length + " bytes)")',
    '        return',
    '      }',
    `      console.log(${JSON.stringify(hint)})`,
    '    })',
    '  },',
    '})',
    '',
  ].join('\n');
}

const normalize = (s: string): string => s.replace(/\r\n/g, '\n');

/** Ours means byte-canonical modulo line endings: a committed file checked
 *  out with CRLF on Windows is the same plugin, never a rewrite target. */
const isCanonical = (content: string, canonical: string): boolean => normalize(content) === canonical;

function guarded(d: HostCapabilityDeclaration | undefined): HostCapabilityDeclaration {
  if (!d || d.id !== 'opencode') die(2, 'adapter opencode: this build has no matching declaration (aegis host inspect opencode)');
  const problems = declarationProblems(d);
  if (problems.length > 0) die(4, `adapter opencode refuses a problem-bearing declaration: ${problems.join('; ')}`);
  if (!d.events.context) die(4, 'adapter opencode: the declaration has no context binding - manual guidance only; nothing to install');
  if (d.install_strategy !== 'dedicated-file') die(4, `adapter opencode: expected install_strategy dedicated-file, got '${d.install_strategy}'`);
  if (d.config_files.length !== 1) die(4, `adapter opencode: expected exactly one documented config file, got ${d.config_files.length}`);
  return d;
}

/** lstat every path this adapter will touch, before any mutation. */
function guardTargets(target: string): void {
  const containers = [path.dirname(path.dirname(target)), path.dirname(target)];
  for (const p of [...containers, target, target + BACKUP_SUFFIX]) {
    let st: fs.Stats | null = null;
    try { st = fs.lstatSync(p); } catch (e: any) { if (e?.code !== 'ENOENT') die(9, `cannot inspect ${p} (${e?.code ?? e}) - nothing was written`); }
    if (st === null) continue;
    if (st.isSymbolicLink()) die(4, `${p} is a link - Aegis never writes through links; replace or remove it and re-run`);
    if (containers.includes(p) && !st.isDirectory()) die(4, `${p} exists and is not a directory - resolve it manually; nothing was written`);
    if (p === target && !st.isFile()) die(4, `${p} exists and is not a regular file - resolve it manually; nothing was written`);
  }
}

export function installAdapter(d: HostCapabilityDeclaration | undefined, dir: string): void {
  const decl = guarded(d);
  const command = decl.events.context.command;
  const argv = command.split(' ');
  const rel = decl.config_files[0];
  const target = path.join(dir, rel);
  const backupPath = target + BACKUP_SUFFIX;
  guardTargets(target);
  const canonical = opencodePluginSource(argv);
  if (fs.existsSync(target)) {
    let existing = '';
    try { existing = fs.readFileSync(target, 'utf8'); } catch (e: any) { die(4, `cannot read ${target} (${e?.code ?? e}) - nothing was written`); }
    if (!isCanonical(existing, canonical))
      die(4, `refusing to overwrite a foreign ${rel} - it is not the canonical aegis plugin; move it away or merge your changes and re-run (nothing was written)`);
    ok(`host opencode: already installed - ${rel} is canonical (command: '${command}'; no shell; one run per session)`);
    return;
  }
  if (fs.existsSync(backupPath))
    die(4, `a previous backup exists (${path.basename(backupPath)}) with no plugin file - if you uninstalled earlier, remove the backup to allow a fresh install; Aegis never guesses`);
  try {
    fs.mkdirSync(path.dirname(target), { recursive: true });
  } catch (e: any) {
    die(9, `cannot create ${path.dirname(target)} (${e?.code ?? e}) - nothing was written`);
  }
  try {
    writeTextAtomic(target, canonical);
  } catch (e: any) {
    die(9, `cannot write ${rel} (${e?.code ?? e?.message ?? e}) - nothing was written`);
  }
  let after = '';
  try {
    after = fs.readFileSync(target, 'utf8');
  } catch (e: any) {
    try { fs.unlinkSync(target); } catch { /* best effort */ }
    die(9, `post-write verification could not re-read ${rel} (${e?.code ?? e}) - the partial file was removed; check permissions and re-run`);
  }
  if (after !== canonical) {
    try { fs.unlinkSync(target); } catch { /* best effort */ }
    die(9, `post-write verification failed - ${rel} is not the canonical bytes; the file was removed; inspect the environment before retrying`);
  }
  ok(`host opencode: installed the read-only context plugin at ${rel} (command: '${command}'; no shell; runs once per session on the first context build)`);
}

export function uninstallAdapter(d: HostCapabilityDeclaration | undefined, dir: string): void {
  const decl = guarded(d);
  const rel = decl.config_files[0];
  const target = path.join(dir, rel);
  const backupPath = target + BACKUP_SUFFIX;
  guardTargets(target);
  if (!fs.existsSync(target)) {
    ok(`host opencode: no ${rel} - nothing to remove`);
    return;
  }
  let existing = '';
  try { existing = fs.readFileSync(target, 'utf8'); } catch (e: any) { die(4, `cannot read ${target} (${e?.code ?? e}) - nothing was removed`); }
  if (!isCanonical(existing, opencodePluginSource(decl.events.context.command.split(' '))))
    die(4, `refusing to remove a foreign ${rel} - only a canonical adapter-owned plugin is removable (nothing was removed)`);
  try {
    fs.unlinkSync(target);
  } catch (e: any) {
    const note = fs.existsSync(backupPath) ? ` (backup kept: ${path.basename(backupPath)})` : '';
    die(9, `cannot remove ${rel} (${e?.code ?? e?.message ?? e}) - the file is unchanged${note}`);
  }
  for (const p of [path.dirname(target), path.dirname(path.dirname(target))]) {
    try { fs.rmdirSync(p); } catch { /* non-empty or already gone: keep */ }
  }
  const backupNote = fs.existsSync(backupPath) ? ` (backup kept: ${path.basename(backupPath)})` : '';
  ok(`host opencode: removed ${rel}${backupNote}`);
}

export function verifyAdapter(d: HostCapabilityDeclaration | undefined, dir: string): void {
  const decl = guarded(d);
  const cmd = decl.verification.command;
  const r = spawnSync(cmd, { shell: true, cwd: dir, encoding: 'utf8', timeout: 60_000 });
  const out = (r.stdout ?? '').trim();
  console.log(`verification: ${cmd}`);
  console.log(`result: ${out === '' ? '(no output)' : out} (exit ${r.error ? 'runner error' : r.signal ?? r.status})`);
  if (r.error || r.signal || r.status !== 0)
    die(9, `host ${decl.id}: binding not present or unmeasurable - ${decl.verification.expects}`);
  if (out === '1') {
    ok(`host ${decl.id}: aegis binding present (verification printed 1)`);
    return;
  }
  die(9, `host ${decl.id}: binding not present - verification printed '${out}', expected '1' (${decl.verification.expects})`);
}
