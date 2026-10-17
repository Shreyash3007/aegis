/** N1 contract: the release evidence document, schema v2 (v0.11 R4).
 *  Produced by the extended aggregate exporter (`aegis evidence export`) and
 *  consumed by the release ritual and release sidecars. Privacy and honesty
 *  are part of the interface, not implementation detail:
 *  - aggregate only: never raw prompts, credentials, private paths, model
 *    names or arbitrary command lines;
 *  - observations are immutable: publication never replaces an existing file
 *    (successor filenames only);
 *  - caller-reported usage stays labelled reported - never billing, never a
 *    measured number;
 *  - missing or stale observations refuse publication instead of guessing. */

/** One release-battery observation - fixed step names, redacted summaries. */
export interface EvidenceObservation {
  /** Step identity from the release battery (not an arbitrary user command). */
  name: string;
  /** The battery command as executed (battery entries only; redacted). */
  command: string;
  exit: number;
  /** One redacted line; private paths and secrets are refused upstream. */
  summary: string;
}

/** One published artifact bound to its bytes. */
export interface EvidenceArtifact {
  name: string;
  sha256: string;
  bytes: number;
}

export interface ReleaseEvidenceV2 {
  schema_version: 2;
  /** Exact candidate commit the observations belong to. */
  source_sha: string;
  /** Exact-commit CI linkage (null when none is recorded - never guessed). */
  ci: { run_url: string | null; conclusion: string | null };
  observations: EvidenceObservation[];
  artifacts: EvidenceArtifact[];
  usage: {
    provenance: 'executor-reported (not independently verified)';
    reports: number;
    tokens_in: number | null;
    tokens_out: number | null;
    cost_usd: number | null;
    cost_status: 'UNMEASURED' | 'REPORTED';
  };
  /** Judgment-budget summary (advisory; shape owned by the judgment ring). */
  judgments: Record<string, unknown>;
  /** What this evidence does NOT establish. */
  limitations: string[];
  privacy: 'aggregate only; no raw state, prompts, model names or commands';
}
