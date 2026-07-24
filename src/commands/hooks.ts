import fs from 'node:fs';
import { die, ok, readJ, writeJ } from '../lib/util.js';
import { configP, Config } from '../lib/state.js';
import { installHooks, managedHookNames, HookProfile } from '../lib/hooks.js';

const PROFILES: HookProfile[] = ['minimal', 'standard', 'strict'];

/** aegis hooks [--profile minimal|standard|strict]
 *  With --profile: persist config.hooks_profile and (re)install hooks for it.
 *  Without args: reinstall the configured profile (default standard).
 *  Reports which hooks were installed and which were removed. Foreign hooks
 *  and `.aegis-orig` backups are always preserved (handled in installHooks). */
export function hooks(args: string[]): void {
  if (!fs.existsSync(configP)) die(2, 'no config - run aegis init first');
  const cfg = readJ<Config>(configP);
  const pi = args.indexOf('--profile');
  let profile: HookProfile;
  if (pi !== -1) {
    const v = args[pi + 1];
    if (!v) die(4, '--profile requires a value; usage: aegis hooks [--profile minimal|standard|strict]');
    if (!(PROFILES as readonly string[]).includes(v))
      die(4, `unknown hooks profile '${v}'; usage: aegis hooks [--profile minimal|standard|strict]`);
    profile = v as HookProfile;
    cfg.hooks_profile = profile;
    writeJ(configP, cfg);
  } else {
    profile = cfg.hooks_profile ?? 'standard';
  }
  const before = managedHookNames();
  const installed = installHooks(profile);
  const after = managedHookNames();
  const removed = before.filter((n) => !after.includes(n));
  ok(`hooks profile '${profile}': installed [${installed.join(', ') || 'none'}]`
    + (removed.length ? `, removed [${removed.join(', ')}]` : ''));
}
