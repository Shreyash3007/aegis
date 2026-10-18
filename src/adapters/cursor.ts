import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { die, ok, writeTextAtomic } from '../lib/util.js';
import { HostCapabilityDeclaration } from '../contracts/hosts.js';
import { declarationProblems } from '../hosts/declarations.js';
import { pathHits } from './claude-code.js';

/** Cursor host adapter (v0.11 R3c). Installs exactly one managed entry in
 *  the project's .cursor/hooks.json: a sessionStart entry whose only member
 *  is the declaration's read-only `aegis status` binding, in the documented
 *  Cursor hooks shape (version 1; hooks.sessionStart entries with one
 *  `command` shell string run from the project root). The entry's identity
 *  is structural - an exact object (only key: command) equal to the
 *  declaration argv - never a substring search. Security-audit S1
 *  mitigations, in order: links refuse (lstat before any mutation); a stray
 *  or duplicated aegis entry refuses instead of guessing; the target is
 *  backed up once, named, before the first change; a pre-existing backup
 *  without a managed entry is ambiguity and refuses; install and uninstall
 *  touch only the managed entry; every write re-reads the file and fails
 *  (restoring the pre-write state) if any model/provider/effort field
 *  changed or anything outside the managed entry moved. Cursor is absent
 *  locally, so this adapter ships fixture-only: the capability declaration
 *  is never upgraded here - that needs a recorded real versioned-host smoke
 *  and an owner decision on the advertised scope (the fixture suite pins
 *  this). Adapters never own pipeline state, dispatch agents or add model
 *  routing - the installed command is the declaration's argv, nothing else. */

export interface CursorEntry {
  command: string;
}

const BACKUP_SUFFIX = '.aegis-backup';
const PROTECTED = /model|provider|effort/i;
const PATH_MISSING = 'aegis was not found on PATH in this environment - install the CLI before relying on the hook';

/** The canonical managed entry: the declaration argv as the single
 *  documented `command` field (a shell string Cursor runs from the project
 *  root). Extra knobs are foreign - ours is exactly the documented field. */
export function cursorEntry(argv: string[]): CursorEntry {
  return { command: argv.join(' ') };
}

const isPlain = (o: unknown): o is Record<string, any> =>
  !!o && typeof o === 'object' && !Array.isArray(o);

const sameJson = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

const clone = <T>(o: T): T => JSON.parse(JSON.stringify(o)) as T;

/** Exact structural match (same key set, same values) of a hand-written
 *  entry against the canonical entry - extra knobs make it foreign, not
 *  ours. */
function isEntry(e: unknown, argv: string[]): boolean {
  if (!isPlain(e)) return false;
  const keys = Object.keys(e);
  return keys.length === 1 && keys[0] === 'command' && e.command === argv.join(' ');
}

/** Any string command naming the `aegis` binary that is not exactly the
 *  canonical entry - a hand-tuned or misplaced aegis hook must never be
 *  silently adopted or duplicated. */
const isAegisShaped = (e: unknown): boolean =>
  isPlain(e) && typeof e.command === 'string' && /^aegis(?: |$)/.test(e.command);

/** Structural scan of every hooks event list: how many managed entries exist
 *  under the declared sessionStart event, and whether aegis-shaped content
 *  appears anywhere that is not exactly canonical (ambiguity - refused,
 *  never adopted or duplicated). */
function scanHooks(obj: Record<string, any>, argv: string[]): { managed: number; stray: boolean } {
  let managed = 0;
  let stray = false;
  const hooks = obj.hooks;
  if (hooks === undefined) return { managed, stray };
  if (!isPlain(hooks)) die(4, "hooks.json 'hooks' is not an object - Aegis refuses to guess; resolve it manually and re-run");
  for (const [event, list] of Object.entries(hooks)) {
    if (!Array.isArray(list)) die(4, `hooks.json 'hooks.${event}' is not an array - Aegis refuses to guess; resolve it manually and re-run`);
    for (const e of list) {
      if (isEntry(e, argv)) {
        if (event === 'sessionStart') managed += 1;
        else stray = true;
      } else if (isAegisShaped(e)) {
        stray = true;
      }
    }
  }
  return { managed, stray };
}

/** Remove managed entries everywhere (they are only ever legitimate under
 *  sessionStart; this also serves the comparison strip) and prune emptied
 *  containers - the whole file is left byte-identical otherwise. */
function stripManaged(obj: Record<string, any>, argv: string[]): Record<string, any> {
  const c = clone(obj);
  if (!isPlain(c.hooks)) return c;
  for (const [event, list] of Object.entries(c.hooks)) {
    if (!Array.isArray(list)) continue;
    c.hooks[event] = (list as unknown[]).filter((e) => !isEntry(e, argv));
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

/** Format-preserving serialization: the file's own indent, trailing newline
 *  and CRLF endings are kept so the diff stays the entry. */
function serialize(obj: Record<string, any>, src: string | null): string {
  if (src === null) return JSON.stringify(obj, null, 2) + '\n';
  const minified = !src.includes('\n');
  const body = minified ? JSON.stringify(obj) : JSON.stringify(obj, null, detectIndent(src));
  const out = body + (src.endsWith('\n') ? '\n' : '');
  return src.includes('\r\n') ? out.replace(/\n/g, '\r\n') : out;
}

function guarded(d: HostCapabilityDeclaration | undefined): HostCapabilityDeclaration {
  if (!d || d.id !== 'cursor') die(2, 'adapter cursor: this build has no matching declaration (aegis host inspect cursor)');
  const problems = declarationProblems(d);
  if (problems.length > 0) die(4, `adapter cursor refuses a problem-bearing declaration: ${problems.join('; ')}`);
  if (!d.events.sessionStart) die(4, 'adapter cursor: the declaration has no sessionStart binding - manual guidance only; nothing to install');
  if (d.install_strategy !== 'marker-block') die(4, `adapter cursor: expected install_strategy marker-block, got '${d.install_strategy}'`);
  if (d.config_files.length !== 1) die(4, `adapter cursor: expected exactly one documented config file, got ${d.config_files.length}`);
  return d;
}

const bindingArgv = (d: HostCapabilityDeclaration): string[] => d.events.sessionStart.command.split(' ');

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

function restore(target: string, src: string | null): void {
  try {
    if (src === null) fs.rmSync(target, { force: true });
    else writeTextAtomic(target, src);
  } catch (e: any) {
    die(9, `post-write verification failed AND the restore of ${target} failed (${e?.code ?? e}) - restore it manually from ${path.basename(target + BACKUP_SUFFIX)} or your VCS`);
  }
}

/** The S1 tripwire: re-read the file we just wrote and refuse (restoring the
 *  pre-write state) if any model/provider/effort field changed or appeared,
 *  or if anything outside the managed entry moved. Nothing normalizes. */
function verifyWrite(before: Record<string, any>, src: string | null, rel: string, target: string, argv: string[]): void {
  let after: Record<string, any>;
  try { after = JSON.parse(fs.readFileSync(target, 'utf8')); }
  catch (e: any) {
    restore(target, src);
    die(9, `post-write verification could not re-read ${rel} (${e?.message ?? e}) - the write was rolled back`);
  }
  const problems: string[] = [];
  const preP = protectedPaths(before);
  const postP = protectedPaths(after);
  for (const [p, v] of Object.entries(preP)) if (postP[p] !== v) problems.push(`protected field changed: ${p}`);
  for (const p of Object.keys(postP)) if (!(p in preP)) problems.push(`protected field appeared: ${p}`);
  if (!sameJson(stripManaged(before, argv), stripManaged(after, argv)))
    problems.push('content outside the managed entry changed');
  if (problems.length > 0) {
    restore(target, src);
    die(9, `post-write verification failed (${problems.join('; ')}) - the write was rolled back; inspect ${rel} before retrying`);
  }
}

export function installAdapter(d: HostCapabilityDeclaration | undefined, dir: string): void {
  const decl = guarded(d);
  const argv = bindingArgv(decl);
  const rel = decl.config_files[0];
  const command = decl.events.sessionStart.command;
  const target = path.join(dir, rel);
  const backupPath = target + BACKUP_SUFFIX;
  guardTargets(target);
  const warning = pathHits().length === 0 ? PATH_MISSING : undefined;
  const { obj, src } = readSettings(target, fs.existsSync(target));
  if (src === null) obj.version = 1; // the documented schema field on a fresh file
  const { managed, stray } = scanHooks(obj, argv);
  if (stray) die(4, `an '${command}' hook entry exists that is not the canonical managed entry - Aegis refuses to guess; resolve it manually and re-run`);
  if (managed > 1) die(4, `multiple managed entries (${managed}) - ambiguous generations; Aegis refuses to guess; resolve them manually and re-run`);
  if (managed === 0 && fs.existsSync(backupPath))
    die(4, `a previous backup exists (${path.basename(backupPath)}) with no managed entry - if you uninstalled earlier, remove the backup to allow a fresh install; Aegis never guesses`);
  if (managed === 1) {
    ok(`host cursor: already installed - the managed entry is canonical (command: '${command}'; shell string, run from the project root)`);
    if (warning) console.log(`note: ${warning}`);
    return;
  }
  const before = clone(obj);
  let backupCreated = false;
  if (src !== null) {
    fs.copyFileSync(target, backupPath);
    backupCreated = true;
  } else {
    // The parent was lstat-checked above (never a link, never a file); a
    // fresh project gets its .cursor directory created here.
    fs.mkdirSync(path.dirname(target), { recursive: true });
  }
  obj.hooks ??= {};
  obj.hooks.sessionStart ??= [];
  obj.hooks.sessionStart.push(cursorEntry(argv));
  try {
    writeTextAtomic(target, serialize(obj, src));
  } catch (e: any) {
    const note = fs.existsSync(backupPath) ? `; the pre-install backup is kept at ${path.basename(backupPath)}` : '';
    die(9, `cannot write ${rel} (${e?.code ?? e?.message ?? e}) - the file is unchanged${note}`);
  }
  verifyWrite(before, src, rel, target, argv);
  ok(`host cursor: ${backupCreated
    ? `installed the managed sessionStart entry in ${rel} (command: '${command}'; backup: ${path.basename(backupPath)})`
    : `created ${rel} with the managed sessionStart entry (command: '${command}'; no backup - the file did not exist)`}`);
  if (warning) console.log(`note: ${warning}`);
}

export function uninstallAdapter(d: HostCapabilityDeclaration | undefined, dir: string): void {
  const decl = guarded(d);
  const argv = bindingArgv(decl);
  const rel = decl.config_files[0];
  const command = decl.events.sessionStart.command;
  const target = path.join(dir, rel);
  const backupPath = target + BACKUP_SUFFIX;
  guardTargets(target);
  if (!fs.existsSync(target)) {
    ok(`host cursor: no ${rel} - nothing to remove`);
    return;
  }
  const { obj, src } = readSettings(target, true);
  const { managed, stray } = scanHooks(obj, argv);
  if (stray) die(4, `an '${command}' hook entry exists that is not the canonical managed entry - Aegis refuses to guess; resolve it manually and re-run`);
  if (managed > 1) die(4, `multiple managed entries (${managed}) - ambiguous generations; Aegis refuses to guess; resolve them manually and re-run`);
  if (managed === 0) {
    ok(`host cursor: no managed entry in ${rel} - nothing to remove`);
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
  ok(`host cursor: removed the managed entry from ${rel}${backupNote}`);
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
