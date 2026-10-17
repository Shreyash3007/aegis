import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { die, ok, writeTextAtomic } from '../lib/util.js';
import { HostCapabilityDeclaration } from '../contracts/hosts.js';
import { declarationProblems } from '../hosts/declarations.js';

/** Claude Code host adapter (v0.11 R3a). Installs exactly one managed block
 *  in the project's .claude/settings.json: a SessionStart hook group whose
 *  only member is the declaration's read-only `aegis status` binding. The
 *  block's identity is structural - an exact group (its only key is hooks)
 *  whose single member deep-equals one of the two documented entry forms -
 *  never a substring search. Security-audit S1 mitigations, in order: links
 *  refuse (lstat before any mutation); the target is backed up once, named,
 *  before the first change; a pre-existing backup without a managed block is
 *  ambiguity and refuses; install and uninstall touch only the block; every
 *  write re-reads the file and fails (restoring the pre-write bytes) if any
 *  model/provider/effort field changed or any content outside the block
 *  moved. Adapters never own pipeline state, dispatch agents or add model
 *  routing - the installed command is the declaration's argv, nothing else. */

export interface ClaudeEntry {
  type: 'command';
  command: string;
  args?: string[];
}

export interface BindingChoice {
  entry: ClaudeEntry;
  form: 'exec' | 'shell';
  warning?: string;
}

const BACKUP_SUFFIX = '.aegis-backup';
const PROTECTED = /model|provider|effort/i;

/** How `aegis` resolves on PATH right now (argv scan, no shell on Windows). */
export function pathHits(): string[] {
  const r = process.platform === 'win32'
    ? spawnSync('where.exe', ['aegis'], { encoding: 'utf8', timeout: 5000 })
    : spawnSync('sh', ['-c', 'command -v aegis'], { encoding: 'utf8', timeout: 5000 });
  return (r.stdout ?? '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

/** The two documented install forms. Exec form (command+args, no shell) is
 *  preferred when the first PATH hit is something the host can spawn
 *  directly; a Windows .cmd/.ps1 shim cannot be exec-spawned, so the
 *  documented shell form is used instead. A CLI absent from PATH selects the
 *  platform's standard form plus an honest note - never a fallback
 *  mechanism. */
export function bindingFor(argv: string[], platform: string, hits: string[]): BindingChoice {
  const first = (hits[0] ?? '').toLowerCase();
  const canExec = platform === 'win32' ? first.endsWith('.exe') : true;
  const warning = hits.length === 0
    ? 'aegis was not found on PATH in this environment - install the CLI before relying on the hook'
    : undefined;
  if (canExec) return { entry: { type: 'command', command: argv[0], args: argv.slice(1) }, form: 'exec', warning };
  return { entry: { type: 'command', command: argv.join(' ') }, form: 'shell', warning };
}

const isPlain = (o: unknown): o is Record<string, any> =>
  !!o && typeof o === 'object' && !Array.isArray(o);

const sameJson = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

const clone = <T>(o: T): T => JSON.parse(JSON.stringify(o)) as T;

const entryShapes = (argv: string[]): ClaudeEntry[] => [
  { type: 'command', command: argv[0], args: argv.slice(1) },
  { type: 'command', command: argv.join(' ') },
];

/** Exact structural match (same key set, same values, order-insensitive) of
 *  a hand-written entry against the canonical forms - an entry with extra
 *  knobs is foreign, not ours. */
function isEntry(e: unknown, argv: string[]): boolean {
  if (!isPlain(e)) return false;
  return entryShapes(argv).some((s) => {
    const ek = Object.keys(e).sort();
    const sk = Object.keys(s).sort();
    return sameJson(ek, sk) && ek.every((k) => sameJson(e[k], (s as Record<string, any>)[k]));
  });
}

const groupHooks = (g: unknown): unknown[] | null =>
  isPlain(g) && Array.isArray(g.hooks) ? (g.hooks as unknown[]) : null;

/** Our managed block: a group whose only key is hooks and whose hooks array
 *  is exactly one canonical entry (either documented form). */
function isManagedGroup(g: unknown, argv: string[]): boolean {
  if (!isPlain(g) || !sameJson(Object.keys(g).sort(), ['hooks'])) return false;
  const members = g.hooks;
  return Array.isArray(members) && members.length === 1 && isEntry(members[0], argv);
}

/** Structural scan of every hooks event list: how many managed blocks exist
 *  under the declared event, and whether an aegis-shaped group or entry
 *  appears anywhere else (ambiguity - refused, never adopted or duplicated). */
function scanHooks(obj: Record<string, any>, argv: string[]): { managed: number; stray: boolean } {
  let managed = 0;
  let stray = false;
  const hooks = obj.hooks;
  if (hooks === undefined) return { managed, stray };
  if (!isPlain(hooks)) die(4, "settings.json 'hooks' is not an object - Aegis refuses to guess; resolve it manually and re-run");
  for (const [event, list] of Object.entries(hooks)) {
    if (!Array.isArray(list)) die(4, `settings.json hooks.${event} is not an array - Aegis refuses to guess; resolve it manually and re-run`);
    for (const g of list) {
      if (isManagedGroup(g, argv)) {
        if (event === 'SessionStart') managed++;
        else stray = true;
        continue;
      }
      const members = groupHooks(g);
      if (members) {
        if (members.some((e) => isEntry(e, argv))) stray = true;
      } else if (isEntry(g, argv)) stray = true;
    }
  }
  return { managed, stray };
}

/** Remove managed blocks everywhere (they are only ever legitimate under
 *  SessionStart; this also serves the comparison strip) and prune emptied
 *  containers - the whole file is left byte-identical otherwise. */
function stripManaged(obj: Record<string, any>, argv: string[]): Record<string, any> {
  const c = clone(obj);
  if (!isPlain(c.hooks)) return c;
  for (const [event, list] of Object.entries(c.hooks)) {
    if (!Array.isArray(list)) continue;
    c.hooks[event] = list.filter((g) => !isManagedGroup(g, argv));
    if ((c.hooks[event] as unknown[]).length === 0) delete c.hooks[event];
  }
  if (Object.keys(c.hooks).length === 0) delete c.hooks;
  return c;
}

/** Every key path matching model/provider/effort with the raw serialization
 *  of its value - compared, never normalized. */
function protectedPaths(o: unknown, at: string[] = [], out: Record<string, string> = {}): Record<string, string> {
  if (Array.isArray(o)) {
    o.forEach((v, i) => protectedPaths(v, [...at, String(i)], out));
    return out;
  }
  if (!isPlain(o)) return out;
  for (const [k, v] of Object.entries(o)) {
    const p = [...at, k];
    if (PROTECTED.test(k)) out[p.join('.')] = JSON.stringify(v);
    protectedPaths(v, p, out);
  }
  return out;
}

function detectIndent(src: string): string {
  let best: string | undefined;
  for (const line of src.split(/\r?\n/)) {
    const m = line.match(/^([ \t]+)"/);
    if (m && (best === undefined || m[1].length < best.length)) best = m[1];
  }
  return best ?? '  ';
}

/** Format-preserving serialization: the file's own indent and trailing
 *  newline (and CRLF endings) are kept so the diff stays the block. */
function serialize(obj: Record<string, any>, src: string | null): string {
  if (src === null) return JSON.stringify(obj, null, 2) + '\n';
  const minified = !src.includes('\n');
  const body = minified ? JSON.stringify(obj) : JSON.stringify(obj, null, detectIndent(src));
  const out = body + (src.endsWith('\n') ? '\n' : '');
  return src.includes('\r\n') ? out.replace(/\n/g, '\r\n') : out;
}

function guarded(d: HostCapabilityDeclaration | undefined): HostCapabilityDeclaration {
  if (!d || d.id !== 'claude-code') die(2, 'adapter claude-code: this build has no matching declaration (aegis host inspect claude-code)');
  const problems = declarationProblems(d);
  if (problems.length > 0) die(4, `adapter claude-code refuses a problem-bearing declaration: ${problems.join('; ')}`);
  if (!d.events.SessionStart) die(4, 'adapter claude-code: the declaration has no SessionStart binding - manual guidance only; nothing to install');
  if (d.install_strategy !== 'marker-block') die(4, `adapter claude-code: expected install_strategy marker-block, got '${d.install_strategy}'`);
  if (d.config_files.length !== 1) die(4, `adapter claude-code: expected exactly one documented config file, got ${d.config_files.length}`);
  return d;
}

const bindingArgv = (d: HostCapabilityDeclaration): string[] => d.events.SessionStart.command.split(' ');

/** lstat every path this adapter will touch, before any mutation. */
function guardTargets(target: string): void {
  const parent = path.dirname(target);
  for (const p of [parent, target, target + BACKUP_SUFFIX]) {
    let st: fs.Stats | null = null;
    try { st = fs.lstatSync(p); } catch (e: any) { if (e?.code !== 'ENOENT') die(9, `cannot inspect ${p} (${e?.code ?? e}) - nothing was written`); }
    if (st === null) continue;
    if (st.isSymbolicLink()) die(4, `${p} is a link - Aegis never writes through links; replace or remove it and re-run`);
    if (p === parent && !st.isDirectory()) die(4, `${p} exists and is not a directory - resolve it manually; nothing was written`);
    if (p === target && !st.isFile()) die(4, `${p} exists and is not a regular file - resolve it manually; nothing was written`);
  }
}

function readSettings(target: string, existed: boolean): { obj: Record<string, any>; src: string | null } {
  if (!existed) return { obj: {}, src: null };
  let src = '';
  try { src = fs.readFileSync(target, 'utf8'); } catch (e: any) { die(4, `cannot read ${target} (${e?.code ?? e}) - nothing was written`); }
  let obj: unknown;
  try { obj = JSON.parse(src); } catch (e: any) { die(4, `${target} is not valid JSON (${e?.message ?? e}) - fix it first; nothing was written`); }
  if (!isPlain(obj)) die(4, `${target} is not a JSON object - fix it first; nothing was written`);
  return { obj, src };
}

function restore(target: string, src: string | null, rel: string): void {
  try {
    if (src === null) fs.rmSync(target, { force: true });
    else writeTextAtomic(target, src);
  } catch (e: any) {
    die(9, `post-write verification failed AND the restore of ${rel} failed (${e?.code ?? e}) - restore it manually from ${path.basename(target + BACKUP_SUFFIX)} or your VCS`);
  }
}

/** The S1 tripwire: re-read the file we just wrote and refuse (restoring the
 *  pre-write bytes) if any model/provider/effort field changed or appeared,
 *  or if anything outside the managed block moved. Nothing normalizes. */
function verifyWrite(before: Record<string, any> | null, src: string | null, rel: string, target: string, argv: string[]): void {
  let after: Record<string, any>;
  try { after = JSON.parse(fs.readFileSync(target, 'utf8')); }
  catch (e: any) {
    restore(target, src, rel);
    die(9, `post-write verification could not re-read ${rel} (${e?.message ?? e}) - the file was restored`);
  }
  const problems: string[] = [];
  const preP = before === null ? {} : protectedPaths(before);
  const postP = protectedPaths(after);
  for (const [p, v] of Object.entries(preP)) if (postP[p] !== v) problems.push(`protected field changed: ${p}`);
  for (const p of Object.keys(postP)) if (!(p in preP)) problems.push(`protected field appeared: ${p}`);
  if (!sameJson(before === null ? {} : stripManaged(before, argv), stripManaged(after, argv)))
    problems.push('content outside the managed block changed');
  if (problems.length > 0) {
    restore(target, src, rel);
    die(9, `post-write verification failed (${problems.join('; ')}) - the file was restored; inspect ${rel} before retrying`);
  }
}

export function installAdapter(d: HostCapabilityDeclaration | undefined, dir: string): void {
  const decl = guarded(d);
  const argv = bindingArgv(decl);
  const choice = bindingFor(argv, process.platform, pathHits());
  const rel = decl.config_files[0];
  const command = decl.events.SessionStart.command;
  const target = path.join(dir, rel);
  const backupPath = target + BACKUP_SUFFIX;
  guardTargets(target);
  const { obj, src } = readSettings(target, fs.existsSync(target));
  const { managed, stray } = scanHooks(obj, argv);
  if (stray) die(4, `an '${command}' hook entry exists outside the managed block - Aegis refuses to guess; resolve it manually and re-run`);
  if (managed > 1) die(4, `multiple managed blocks (${managed}) - ambiguous generations; Aegis refuses to guess; resolve them manually and re-run`);
  if (managed === 0 && fs.existsSync(backupPath))
    die(4, `a previous backup exists (${path.basename(backupPath)}) with no managed block - if you uninstalled earlier, remove the backup to allow a fresh install; Aegis never guesses`);
  const before = src === null ? null : clone(obj);
  let backupCreated = false;
  let verb: string;
  if (managed === 1) {
    const sessionStart = obj.hooks.SessionStart as Record<string, any>[];
    const idx = sessionStart.findIndex((g) => isManagedGroup(g, argv));
    if (sameJson(sessionStart[idx].hooks[0], choice.entry)) {
      ok(`host claude-code: already installed - the managed block is canonical (${choice.form} form; command: '${command}')`);
      if (choice.warning) console.log(`note: ${choice.warning}`);
      return;
    }
    sessionStart[idx] = { hooks: [choice.entry] };
    verb = `updated the managed block to the ${choice.form} form (command: '${command}')`;
  } else {
    if (src !== null) {
      fs.copyFileSync(target, backupPath);
      backupCreated = true;
    } else {
      // The parent was lstat-checked above (never a link, never a file); a
      // fresh project gets its .claude directory created here.
      fs.mkdirSync(path.dirname(target), { recursive: true });
    }
    obj.hooks ??= {};
    obj.hooks.SessionStart ??= [];
    obj.hooks.SessionStart.push({ hooks: [choice.entry] });
    verb = backupCreated
      ? `installed the ${choice.form} binding as a managed SessionStart block in ${rel} (command: '${command}'; backup: ${path.basename(backupPath)})`
      : `created ${rel} with the managed SessionStart block (command: '${command}'; no backup - the file did not exist)`;
  }
  try {
    writeTextAtomic(target, serialize(obj, src));
  } catch (e: any) {
    const note = fs.existsSync(backupPath) ? `; the pre-install backup is kept at ${path.basename(backupPath)}` : '';
    die(9, `cannot write ${rel} (${e?.code ?? e?.message ?? e}) - the file is unchanged${note}`);
  }
  verifyWrite(before, src, rel, target, argv);
  ok(`host claude-code: ${verb}`);
  if (choice.warning) console.log(`note: ${choice.warning}`);
}

export function uninstallAdapter(d: HostCapabilityDeclaration | undefined, dir: string): void {
  const decl = guarded(d);
  const argv = bindingArgv(decl);
  const rel = decl.config_files[0];
  const target = path.join(dir, rel);
  const backupPath = target + BACKUP_SUFFIX;
  guardTargets(target);
  if (!fs.existsSync(target)) {
    ok(`host claude-code: no ${rel} - nothing to remove`);
    return;
  }
  const { obj, src } = readSettings(target, true);
  const { managed, stray } = scanHooks(obj, argv);
  if (stray) die(4, `an '${decl.events.SessionStart.command}' hook entry exists outside the managed block - Aegis refuses to guess; resolve it manually and re-run`);
  if (managed > 1) die(4, `multiple managed blocks (${managed}) - ambiguous generations; Aegis refuses to guess; resolve them manually and re-run`);
  if (managed === 0) {
    ok(`host claude-code: no managed block in ${rel} - nothing to remove`);
    return;
  }
  const before = clone(obj);
  try {
    writeTextAtomic(target, serialize(stripManaged(obj, argv), src));
  } catch (e: any) {
    const note = fs.existsSync(backupPath) ? `; the pre-install backup is kept at ${path.basename(backupPath)}` : '';
    die(9, `cannot write ${rel} (${e?.code ?? e?.message ?? e}) - the file is unchanged${note}`);
  }
  verifyWrite(before, src, rel, target, argv);
  const backupNote = fs.existsSync(backupPath) ? ` (backup kept: ${path.basename(backupPath)})` : '';
  ok(`host claude-code: removed the managed block from ${rel}${backupNote}`);
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
  die(9, `host ${decl.id}: verification printed '${out}', expected '1' - ${decl.verification.expects}`);
}
