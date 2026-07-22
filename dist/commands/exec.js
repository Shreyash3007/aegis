import { execSync } from 'node:child_process';
import { REPO, die, ok } from '../lib/util.js';
import { acquireState, commitState, stateP } from '../lib/state.js';
import { checkpoint } from './persist.js';
/** aegis exec -- <cmd> (v0.4): enforcement for external executors (opencode,
 *  GLM, fork-agent waves) is prompt-deep - nothing forces their session to
 *  call `aegis transition`. This wrapper gives wave prompts a one-token way
 *  to stay honest: run the command THROUGH aegis, and the run is recorded in
 *  history (command + exit code) with checkpoints before and after. It does
 *  NOT infer or fabricate pipeline transitions (A1.1) - it records reality.
 *  The command's exit code passes through unchanged. */
export function exec(args) {
    const dash = args.indexOf('--');
    const cmd = (dash === -1 ? args : args.slice(dash + 1)).join(' ').trim();
    if (!cmd)
        die(2, 'usage: aegis exec -- <command>');
    checkpoint(['--quiet']);
    let code = 0;
    // Shell on purpose: the operator types the full command. This is trusted
    // input (same posture as owner-declared validate suites) - never wire
    // untrusted/agent-generated strings here without reviewing them first.
    try {
        execSync(cmd, { stdio: 'inherit', cwd: REPO });
    }
    catch (e) {
        code = typeof e.status === 'number' ? e.status : 1;
    }
    // Lock ONLY around the read-append-write - never during the command run
    // (concurrent waves must not serialize their work, just their recording;
    // the lock makes every event land, v0.4.1).
    const s = acquireState(stateP);
    s.history.push({ skill: s.current_skill, at: new Date().toISOString(), event: `exec (exit ${code}): ${cmd}` });
    commitState(stateP, s);
    checkpoint(['--quiet']);
    if (code !== 0) {
        console.error(`FAIL exec exit ${code}: ${cmd} (recorded in history)`);
        process.exit(code > 125 ? 1 : code);
    }
    ok(`exec recorded (exit 0): ${cmd}`);
}
