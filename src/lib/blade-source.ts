import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

/** Git blob ID includes the byte-length header. A tag alone is mutable;
 * verify each loaded skill against the pinned object's actual content. */
export function gitBlob(data: Buffer): string {
  return crypto.createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex');
}

export function verifiedSource(file: string, expectedBlob: string): boolean {
  try { return fs.statSync(file).isFile() && gitBlob(fs.readFileSync(file)) === expectedBlob; }
  catch { return false; }
}

export interface BladePin { name: string; phase: string; path: string; git_blob: string; fallback: string; collisions: string[] }
export interface SourceLock { schema_version: number; commit: string; tag: string; repository: string; skills: BladePin[] }

export function readSourceLock(file: string): SourceLock {
  const lock = JSON.parse(fs.readFileSync(file, 'utf8')) as SourceLock;
  if (lock.schema_version !== 1 || !/^[a-f0-9]{40}$/.test(lock.commit) || !Array.isArray(lock.skills))
    throw new Error('malformed source lock');
  for (const pin of lock.skills) {
    if (!/^[a-f0-9]{40}$/.test(pin.git_blob) || path.isAbsolute(pin.path) || pin.path.split('/').includes('..') ||
        typeof pin.fallback !== 'string' || !Array.isArray(pin.collisions) || !pin.collisions.length)
      throw new Error('malformed blade pin');
  }
  return lock;
}
