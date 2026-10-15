import { spawn, spawnSync } from 'node:child_process';
import { REPO, die, ok } from '../lib/util.js';
import { acquireState, commitState, stateP } from '../lib/state.js';
import { checkpoint } from './persist.js';

/** aegis exec [--timeout <s>] -- <cmd> (v0.4): enforcement for external
 *  executors (opencode, GLM, fork-agent waves) is prompt-deep - nothing
 *  forces their session to call `aegis transition`. This wrapper gives wave
 *  prompts a one-token way to stay honest: run the command THROUGH aegis,
 *  and the run is recorded in history (command + exit code) with checkpoints
 *  before and after. It does NOT infer or fabricate pipeline transitions
 *  (A1.1) - it records reality. The command's exit code passes through
 *  unchanged. --timeout kills runaway commands (default: none); a timeout
 *  records `exec (exit TIMEOUT)` and exits 1 - it is data, not a pass. */
export async function exec(args: string[]): Promise<void> {
  const dash = args.indexOf('--');
  const pre = dash === -1 ? [] : args.slice(0, dash);
  const raw = dash === -1 ? args : args.slice(dash + 1);
  if (!raw.length) die(2, 'usage: aegis exec [--timeout <seconds>] -- <command>');
  if ((pre.length && (pre.length !== 2 || pre[0] !== '--timeout')) || (dash === -1 && raw[0].startsWith('--')))
    die(2, 'usage: aegis exec [--timeout <seconds>] -- <command>');
  let timeoutMs: number | undefined;
  const ti = pre.indexOf('--timeout');
  if (ti >= 0) {
    const secs = Number(pre[ti + 1]);
    if (!Number.isFinite(secs) || secs <= 0 || secs * 1000 > 2_147_483_647) die(2, '--timeout must be a positive, bounded number of seconds');
    timeoutMs = Math.floor(secs * 1000);
  }
  // A single string is explicitly shell syntax; multiple args remain argv.
  // Never apply POSIX quoting to cmd.exe or interpolate literal argv in a shell.
  const cmd = raw.length === 1 ? raw[0] : raw.map((s) => JSON.stringify(s)).join(' ');
  checkpoint(['--quiet']);
  let timedOut = false;
  const code = await new Promise<number>((resolve) => {
    const child = spawn(raw[0], raw.length === 1 ? [] : raw.slice(1), {
      stdio: 'inherit', cwd: REPO, shell: raw.length === 1,
      detached: process.platform !== 'win32',
    });
    const timer = timeoutMs === undefined ? undefined : setTimeout(() => {
      timedOut = true;
      if (child.pid) {
        if (process.platform === 'win32') {
          spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', timeout: 10_000 });
        } else {
          try { process.kill(-child.pid, 'SIGKILL'); } catch { /* process already exited */ }
        }
      }
      child.kill('SIGKILL');
    }, timeoutMs);
    child.on('error', () => { /* close follows startup failure and records exit 1 */ });
    child.once('close', (status) => {
      if (timer) clearTimeout(timer);
      resolve(timedOut ? 1 : status ?? 1);
    });
  });
  // Lock ONLY around the read-append-write - never during the command run
  // (concurrent waves must not serialize their work, just their recording;
  // the lock makes every event land, v0.4.1).
  const s = acquireState(stateP);
  s.history.push({ skill: s.current_skill, at: new Date().toISOString(), event: `exec (exit ${timedOut ? 'TIMEOUT' : code}): ${cmd}` });
  commitState(stateP, s);
  checkpoint(['--quiet']);
  if (timedOut) die(1, `exec TIMEOUT after ${Math.floor((timeoutMs ?? 0) / 1000)}s: ${cmd} (recorded in history)`);
  if (code !== 0) {
    console.error(`FAIL exec exit ${code}: ${cmd} (recorded in history)`);
    process.exit(code > 125 ? 1 : code);
  }
  ok(`exec recorded (exit 0): ${cmd}`);
}
