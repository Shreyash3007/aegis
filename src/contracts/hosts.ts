/** N1 contract: host adapter capability surface (v0.11 "Reach", R2/R3).
 *  A declaration is DATA that states exactly what an adapter may do on one
 *  host, backed by official-doc citations and an evidence status. Adapters
 *  consume declarations; fixtures refuse undeclared behavior.
 *
 *  Invariants (see brain/quality/security-audit.md §S1/S4):
 *  - an undeclared event is explicitly unsupported - never attempted;
 *  - a host without the needed mechanism selects manual guidance - never a
 *    new scheduler, daemon or fallback model;
 *  - adapters never own pipeline state, dispatch agents or add model routing;
 *  - config writes touch only the managed block/file and refuse links. */

export const HOST_SCHEMA_VERSION = 1;

/** Claim level that must match recorded evidence - nothing upgrades by
 *  wishful thinking:
 *  - 'verified': a real versioned-host event smoke is recorded below;
 *  - 'fixture-only': exercised against fixtures, not yet a real host;
 *  - 'manual-guidance': no supported mechanism; Aegis prints instructions. */
export type HostCapabilityStatus = 'verified' | 'fixture-only' | 'manual-guidance';

/** One lifecycle event the host can carry, bound to one aegis invocation. */
export interface HostEventBinding {
  /** Host lifecycle event name, exactly as the cited official docs name it. */
  event: string;
  /** The aegis argv the host runs for this event (no shell interpolation;
   *  the CLI is invoked once per event). */
  command: string;
  /** How event data travels: nothing, or JSON on stdin (forwarded untouched). */
  payload: 'none' | 'stdin-json';
}

/** A versioned, evidence-backed statement of one host's capability. */
export interface HostCapabilityDeclaration {
  schema_version: number; // HOST_SCHEMA_VERSION at write time
  id: string; // stable slug: claude-code | opencode | cursor | ...
  display_name: string;
  status: HostCapabilityStatus;
  /** Official documentation the formats were read from (no invented formats). */
  docs: { url: string; retrieved: string }[];
  /** Real-host smoke records backing 'verified' (empty otherwise). */
  verified_with: { host_version: string; date: string; event: string; evidence: string }[];
  /** Where the adapter writes: project config or user-level config. */
  config_scope: 'project' | 'user';
  /** Documented files the adapter may touch (paths as the host names them). */
  config_files: string[];
  /** Supported events only; absent events are unsupported by construction. */
  events: Record<string, HostEventBinding>;
  /** Events a reasonable user might expect that are deliberately NOT
   *  supported (stated so silence is never read as support). */
  unsupported_events: string[];
  install_strategy: 'marker-block' | 'dedicated-file';
  /** How to check the installation, runnable as written. */
  verification: { command: string; expects: string };
  /** Honest limits of this declaration. */
  limitations: string[];
}
