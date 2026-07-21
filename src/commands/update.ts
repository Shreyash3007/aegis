import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { die, ok } from '../lib/util.js';

const PKG_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Parse `git ls-remote --tags` output into the highest semver tag.
 *  Pure + exported for tests. Ignores ^{} deref lines and non-semver tags. */
export function latestTag(lsRemote: string): string | null {
  const tags = lsRemote.split('\n')
    .map((l) => /refs\/tags\/(v?\d+\.\d+\.\d+)$/.exec(l)?.[1])
    .filter((t): t is string => !!t);
  if (!tags.length) return null;
  const key = (t: string) => t.replace(/^v/, '').split('.').map((n) => parseInt(n, 10));
  return tags.sort((a, b) => {
    const [a1, a2, a3] = key(a), [b1, b2, b3] = key(b);
    return a1 - b1 || a2 - b2 || a3 - b3;
  })[tags.length - 1];
}

/** aegis update [--check] (v0.3): GitHub-only distribution means every fix
 *  previously required a manual re-clone/rebuild/relink. This closes the
 *  loop without an npm registry: find the newest tag on the origin repo and
 *  reinstall globally from its tarball (same path the docs recommend). */
export function update(args: string[]): void {
  const pkg = JSON.parse(fs.readFileSync(path.join(PKG_ROOT, 'package.json'), 'utf8'));
  const current: string = pkg.version;
  const repoUrl: string | undefined = pkg.repository?.url;
  if (!repoUrl) die(2, 'package.json has no repository.url - cannot self-update');
  const https = repoUrl.replace(/^git\+/, '').replace(/\.git$/, '');
  let remote: string;
  try {
    remote = execFileSync('git', ['ls-remote', '--tags', https], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch {
    die(2, `cannot reach ${https} - check network, then retry (or install by hand: npm i -g ${https}/archive/refs/tags/<tag>.tar.gz)`);
  }
  const latest = latestTag(remote);
  if (!latest) die(2, `no semver tags found on ${https}`);
  const latestV = latest.replace(/^v/, '');
  const key = (v: string) => v.split('.').map((n) => parseInt(n, 10));
  const [c1, c2, c3] = key(current), [l1, l2, l3] = key(latestV);
  const behind = l1 > c1 || (l1 === c1 && (l2 > c2 || (l2 === c2 && l3 > c3)));
  if (args.includes('--check')) {
    console.log(behind
      ? `aegis ${current} - update available: ${latestV} (run: aegis update)`
      : `aegis ${current} - up to date`);
    return;
  }
  if (!behind) { ok(`aegis ${current} is already at or ahead of the latest tag (${latestV})`); return; }
  const tarball = `${https}/archive/refs/tags/${latest}.tar.gz`;
  console.log(`updating aegis ${current} -> ${latestV} via ${tarball}`);
  execSync(`npm install -g ${JSON.stringify(tarball)}`, { stdio: 'inherit' });
  ok(`aegis updated to ${latestV} - verify: aegis help`);
}
