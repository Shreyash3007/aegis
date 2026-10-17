import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { die, REPO } from './util.js';
import { ownedPath } from './owned-path.js';

interface Owner { pid: number; at: number; token?: string }
interface Held { token: string; count: number }
const held = new Map<string, Held>();
const sleep = (ms: number): void => { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); };

function readOwner(file: string): Owner | null {
  // An exclusive creator may not have written its bytes yet. Never reclaim
  // unreadable/partial JSON, even after this bounded creation grace period.
  // Access failures (sharing violations) are NOT corruption: a live holder's
  // file can be temporarily unreadable by AV/backup interference, and calling
  // that "malformed" sent the human to preserve a perfectly valid lock.
  let accessFailure: string | null = null;
  let parseFailure = false;
  for (let i = 0; i < 8; i++) {
    try {
      ownedPath(REPO, file);
      const value = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (value && Number.isSafeInteger(value.pid) && value.pid > 0 && Number.isFinite(value.at)
        && (value.token === undefined || typeof value.token === 'string')) return value;
      parseFailure = true;
    } catch (e: any) {
      if (e?.code === 'ENOENT') return null;
      if (['EPERM', 'EACCES', 'EBUSY'].includes(e?.code)) accessFailure = e.code;
      else parseFailure = true;
    }
    sleep(20);
  }
  if (accessFailure && !parseFailure)
    die(4, `lock exists but cannot be read (${accessFailure}): ${file} - a live holder or external interference may be present; inspect before manual recovery`);
  die(4, `malformed lock ${file} - preserve it and investigate; ownership is uncertain`);
}

function dead(pid: number): boolean {
  try { process.kill(pid, 0); return false; }
  catch (e: any) { return e?.code === 'ESRCH'; } // EPERM is not proof of death.
}

function create(file: string, token: string): boolean {
  ownedPath(REPO, file);
  let fd: number;
  try { fd = fs.openSync(file, 'wx'); }
  catch (e: any) {
    // Windows can deny a new exclusive open while the previous lock is
    // delete-pending. Treat it as contention, never as an acquisition. The
    // caller still checks ownership and enforces its existing total deadline.
    if (e?.code === 'EEXIST' || (process.platform === 'win32' && ['EPERM', 'EACCES', 'EBUSY'].includes(e?.code))) return false;
    throw e;
  }
  try { fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, at: Date.now(), token })); }
  catch (e: any) {
    // The empty file is exclusively ours at this instant. If the owner-write
    // fails (disk full, AV quarantine) and we leave it behind, every later
    // contender misreads a 0-byte file as corruption and the repo wedges
    // (reproduced post-release). Close first: Windows cannot unlink an open file.
    try { fs.closeSync(fd); } catch { /* already closed */ }
    try { fs.rmSync(file, { force: true }); } catch { /* best-effort: the malformed-lock verdict still fails closed */ }
    throw e;
  }
  fs.closeSync(fd);
  return true;
}

function releaseOwned(file: string, token: string): void {
  // Only our own live acquisition can be removed. Normal recovery never
  // replaces a live owner, so this check/unlink cannot race a valid reclaimer.
  try {
    ownedPath(REPO, file);
    const owner = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (owner.pid === process.pid && owner.token === token) fs.rmSync(file);
  } catch { /* missing/replaced/corrupt: do not delete somebody else's lock */ }
}

process.once('exit', () => {
  for (const [file, owner] of [...held].reverse()) releaseOwned(file, owner.token);
});

/** Lock a repo-owned resource using `<path>.lock`. Reentrant within this process.
 * A crashed reclaimer guard is deliberately fail-closed, not recursively stolen. */
export function lockFile(resource: string): () => void {
  // Canonicalize before use: the held-key and every helper below must agree
  // on one spelling of the same physical file. Without expansion, two alias
  // spellings in one process contend against themselves for the full bound.
  const file = ownedPath(REPO, path.resolve(`${resource}.lock`));
  const existing = held.get(file);
  if (existing) {
    existing.count++;
  } else {
    const deadline = performance.now() + 60_000;
    const token = randomUUID();
    for (;;) {
      if (create(file, token)) { held.set(file, { token, count: 1 }); break; }
      const owner = readOwner(file);
      if (owner && dead(owner.pid)) {
        const guard = `${file}.reclaim`;
        const guardToken = randomUUID();
        if (create(guard, guardToken)) {
          held.set(guard, { token: guardToken, count: 1 });
          try {
            // Re-read only AFTER excluding every other reclaimer. No stale
            // compare/unlink from a snapshot taken before guard acquisition.
            const current = readOwner(file);
            if (current && dead(current.pid)) {
              try { fs.rmSync(file); }
              catch (e: any) {
                if (['EPERM', 'EACCES', 'EBUSY'].includes(e?.code))
                  die(4, `dead owner's lock cannot be removed (${e.code}): ${file} - external interference holds the file; inspect and remove it manually, then retry`);
                throw e;
              }
            }
          } finally {
            releaseOwned(guard, guardToken); held.delete(guard);
          }
          continue;
        }
      }
      if (performance.now() >= deadline)
        die(4, `resource locked by another aegis process: ${file} (waited 60s); inspect owner/reclaimer before manual recovery`);
      sleep(25 + Math.floor(Math.random() * 25));
    }
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    const owner = held.get(file);
    if (owner && --owner.count === 0) { releaseOwned(file, owner.token); held.delete(file); }
  };
}

export function withFileLock<T>(resource: string, action: () => T): T {
  const release = lockFile(resource);
  try { return action(); } finally { release(); }
}

// Outside .aegis so uninstall cannot delete the lifecycle mutex it holds.
export const lifecyclePath = path.join(REPO, '.aegis-lifecycle');
