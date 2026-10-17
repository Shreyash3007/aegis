import { HostCapabilityDeclaration } from '../contracts/hosts.js';

/** Shipped host capability declarations (v0.11 R2). The set is EMPTY until
 *  the R2 slice lands claude-code / opencode / cursor declarations built
 *  from each host's official documentation. An empty set claims nothing:
 *  `aegis host list` says so and installs refuse. Declarations are data -
 *  this module only exposes the set (no behavior). */
export const HOST_DECLARATIONS: HostCapabilityDeclaration[] = [];

export function findDeclaration(id: string): HostCapabilityDeclaration | undefined {
  return HOST_DECLARATIONS.find((d) => d.id === id);
}
