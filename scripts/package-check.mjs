import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const at = process.argv.indexOf('--directory');
const directory = at >= 0 ? path.resolve(process.argv[at + 1])
  : fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-package-check-'));
fs.mkdirSync(directory, { recursive: true });
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const lock = JSON.parse(fs.readFileSync(path.join(root, 'npm-shrinkwrap.json'), 'utf8'));
const bundledNpm = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
const env = { ...process.env };
for (const key of ['AEGIS_HUMAN_TOKEN', 'TYPESAFE_API_KEY', 'AEGIS_JUDGE_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY']) delete env[key];
function run(bin, args, cwd = root) {
  const r = spawnSync(bin, args, { cwd, env, encoding: 'utf8', timeout: 180000, maxBuffer: 8 * 1024 * 1024 });
  if (r.error || r.status !== 0) throw new Error(`${path.basename(bin)} ${args[0]} failed (${r.status}): ${(r.stderr ?? '').slice(0, 600)}`);
  return r.stdout.trim();
}
function npm(args) {
  return fs.existsSync(bundledNpm) ? run(process.execPath, [bundledNpm, ...args])
    : process.platform === 'win32' ? run('cmd', ['/c', 'npm', ...args]) : run('npm', args);
}

const source = run('git', ['rev-parse', 'HEAD']);
if (run('git', ['status', '--porcelain'])) throw new Error('package verification needs a committed clean source snapshot');
run(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json']);
const existing = path.join(directory, `aegis-${pkg.version}.tgz`);
if (fs.existsSync(existing)) throw new Error('artifact exists; use a new output directory');
const packed = JSON.parse(npm(['pack', '--ignore-scripts', '--json', '--pack-destination', directory]))[0];
if (!packed.files.some((f) => f.path === 'npm-shrinkwrap.json') || !packed.files.some((f) => f.path === 'dist/cli.js'))
  throw new Error('package is missing its compiled entrypoint or consumer dependency lock');
if (!packed.bundled?.includes('ts-morph')) throw new Error('runtime closure was not bundled into the release artifact');
const tarball = path.join(directory, packed.filename);
const prefix = path.join(directory, 'installed');
npm(['install', '--prefix', prefix, '--ignore-scripts', '--offline', '--no-audit', '--no-fund', tarball]);
const install = path.join(prefix, 'node_modules', pkg.name);
const cli = path.join(install, 'dist', 'cli.js');
const version = run(process.execPath, [cli, '--version']);
if (version !== `aegis ${pkg.version}`) throw new Error('installed CLI version mismatch');
let runtimePackages = 0;
for (const [key, entry] of Object.entries(lock.packages)) {
  if (!key.startsWith('node_modules/') || entry.dev) continue;
  const candidates = [path.join(install, key, 'package.json'), path.join(prefix, key, 'package.json')];
  const found = candidates.find((f) => fs.existsSync(f));
  if (!found || JSON.parse(fs.readFileSync(found, 'utf8')).version !== entry.version)
    throw new Error(`installed dependency differs from the source shrinkwrap: ${key}`);
  runtimePackages++;
}
const fixture = path.join(directory, 'fixture');
fs.mkdirSync(fixture);
run('git', ['init', '-q', '-b', 'main'], fixture);
run(process.execPath, [cli, 'init', '--yes', '--profile', 'minimal'], fixture);
run(process.execPath, [cli, 'blade', 'list'], fixture);
const digest = crypto.createHash('sha256').update(fs.readFileSync(tarball)).digest('hex');
fs.writeFileSync(`${tarball}.sha256`, `${digest}  ${path.basename(tarball)}\n`, { flag: 'wx' });
fs.writeFileSync(path.join(directory, 'package-evidence.json'), JSON.stringify({
  source_commit: source, version: pkg.version, artifact: path.basename(tarball), sha256: digest,
  runtime_packages_verified: runtimePackages, install: 'offline, scripts disabled, isolated prefix',
  checks: ['fresh build', 'package contents', 'consumer dependency versions', 'installed version', 'minimal init', 'pinned blade registry'],
}, null, 2) + '\n', { flag: 'wx' });
console.log(`PACKAGE VERIFIED: ${pkg.version}, ${runtimePackages} runtime packages, SHA256 ${digest}\n${tarball}`);
