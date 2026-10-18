import { die } from '../lib/util.js';
import { HOST_DECLARATIONS, findDeclaration } from '../hosts/declarations.js';
import { HostCapabilityDeclaration } from '../contracts/hosts.js';
import { installAdapter as installClaudeCode, uninstallAdapter as uninstallClaudeCode, verifyAdapter as verifyClaudeCode } from '../adapters/claude-code.js';
import { installAdapter as installCursor, uninstallAdapter as uninstallCursor, verifyAdapter as verifyCursor } from '../adapters/cursor.js';
import { installAdapter as installOpencode, uninstallAdapter as uninstallOpencode, verifyAdapter as verifyOpencode } from '../adapters/opencode.js';

/** One line per adapter slice: R3a ships claude-code, R3b ships opencode,
 *  R3c ships cursor - the complete v0.11 adapter set. */
const ADAPTERS: Record<string, {
  install: (d: HostCapabilityDeclaration, dir: string) => void;
  uninstall: (d: HostCapabilityDeclaration, dir: string) => void;
  verify: (d: HostCapabilityDeclaration, dir: string) => void;
}> = {
  'claude-code': { install: installClaudeCode, uninstall: uninstallClaudeCode, verify: verifyClaudeCode },
  'cursor': { install: installCursor, uninstall: uninstallCursor, verify: verifyCursor },
  'opencode': { install: installOpencode, uninstall: uninstallOpencode, verify: verifyOpencode },
};

/** aegis host <list|inspect <id>|install|uninstall|verify <id>> - the host
 *  adapter capability surface (v0.11 "Reach"). list/inspect read the shipped
 *  declarations; install/uninstall/verify are the thin adapters that write
 *  only their managed blocks into the project config. An unknown id or a
 *  host without an adapter in this build is a malformed call (exit 2) -
 *  never a partial install. */
export function host(args: string[]): void {
  const op = args[0];
  if (op === 'list') {
    if (HOST_DECLARATIONS.length === 0) {
      console.log('no host capability declarations in this build - v0.11 R2 adds claude-code / opencode / cursor after official-doc inspection');
      return;
    }
    for (const d of HOST_DECLARATIONS)
      console.log(`${d.id}\t${d.status}\t${d.display_name} (${Object.keys(d.events).length} event(s))`);
    return;
  }
  if (op === 'inspect') {
    const id = args[1];
    if (!id) die(2, 'usage: aegis host inspect <id>');
    const d = findDeclaration(id);
    if (!d) die(2, `unknown host '${id}' (known: ${HOST_DECLARATIONS.map((x) => x.id).join(', ') || 'none'})`);
    console.log(JSON.stringify(d, null, 2));
    return;
  }
  if (op === 'install' || op === 'uninstall' || op === 'verify') {
    const id = args[1];
    if (!id) die(2, `usage: aegis host ${op} <id>`);
    const d = findDeclaration(id);
    if (!d) die(2, `unknown host '${id}' (known: ${HOST_DECLARATIONS.map((x) => x.id).join(', ') || 'none'})`);
    const adapter = ADAPTERS[id];
    if (!adapter) die(2, `no adapter for '${id}' in this build - adapters ship with the R3 slices (see docs/releases/v0.11/PLAN.md)`);
    adapter[op](d, process.cwd());
    return;
  }
  die(2, 'usage: aegis host <list|inspect <id>|install|uninstall|verify <id>>');
}
