import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

export const REPO = process.cwd();
export const AEGIS_DIR = path.join(REPO, '.aegis');

export function die(code: number, msg: string): never {
  console.error(`FAIL ${msg}`);
  process.exit(code);
}
export const ok = (msg: string): void => console.log(`OK ${msg}`);

export const sha = (s: string | Buffer): string =>
  crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);

export const readJ = <T>(p: string): T => JSON.parse(fs.readFileSync(p, 'utf8')) as T;
export const writeJ = (p: string, o: unknown): void =>
  fs.writeFileSync(p, JSON.stringify(o, null, 2) + '\n');

/** git helper - trims output. Never use for content comparison (A1.1). */
export const git = (c: string, cwd: string = REPO): string =>
  execSync(`git ${c}`, { cwd, encoding: 'utf8' }).trim();

/** git helper - raw output, for diffs and content-level checks only. */
export const gitRaw = (c: string, cwd: string = REPO): string =>
  execSync(`git ${c}`, { cwd, encoding: 'utf8' });

export const has = (bin: string): boolean => {
  try { execSync(`command -v ${bin}`, { stdio: 'pipe' }); return true; }
  catch { return false; }
};
