import { die } from '../lib/util.js';
import { HOST_DECLARATIONS, findDeclaration } from '../hosts/declarations.js';

/** aegis host <list|inspect <id>> - the host adapter capability surface
 *  (v0.11 "Reach"). Reads the shipped declarations only; install/uninstall/
 *  verify arrive with the R3 adapter slices. An unknown id is a malformed
 *  call (exit 2) - never a partial install. */
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
  die(2, 'usage: aegis host <list|inspect <id>>');
}
