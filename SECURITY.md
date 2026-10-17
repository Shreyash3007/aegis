# Security Policy

## Reporting a vulnerability

Please **do not open a public GitHub issue** for security vulnerabilities.

Report privately via GitHub's private vulnerability reporting:
<https://github.com/Shreyash3007/aegis/security/advisories/new>

Include: the affected version (`aegis --version`), the exact commands or
files involved, and a minimal reproduction. You will get an acknowledgement
within a few days and, if confirmed, a fix and credit in the release notes
(unless you prefer anonymity).

## Scope

Things we consider security issues in Aegis itself:
- **Shell/command injection** through any user-controlled input (branch
  names, slice names, config values, file contents). Aegis's rule is
  argv-array subprocess calls, never shell interpolation — violations are bugs.
- **Integrity bypasses**: ways to mutate `.aegis/` state, checkpoints, or
  gate approvals without detection (hash verification, state lockfile).
- **Hook behavior** that executes unintended code or blocks/destroys
  pre-existing repo hooks (foreign hooks must be preserved and chained).
- **Secret leakage** into checkpoints, `brain/`, logs, or validation reports.

Things that are **documented design decisions, not vulnerabilities**:

- Gate proof-of-human is an attributed audit trail, not cryptography — an
  agent with full shell access can set `AEGIS_HUMAN_TOKEN` or
  `autonomy: full`. This is stated openly in the README. (Hardening it is a
  feature discussion, welcome as a regular issue.)
- Owner-declared custom validators (`validate_suite.*`) and `aegis exec`
  run shell commands by design — the repo owner is trusted input. Untrusted
  input must never reach these paths; if you find a way it can, that IS in scope.
- External executors (opencode/GLM) comply via prompts — prompt-deep
  enforcement is documented; drift detection is the mitigation.

## Data egress (judgment ring)

`aegis jev` POSTs your `--file` state to `https://api.typesafe.ai`
(the direct backend; `JEV_BACKEND=mock` sends nothing anywhere). Before
sending, the CLI redacts URL passwords, auth/cookie headers, `-u user:pass`,
`TOKEN=`/`SECRET=` assignments, and known key shapes — but redaction is a
backstop, not a plan: **never put secrets, credentials, or customer data in
a judged state**. Rephrase first; the `[redacted]` markers in a stubbed
round-trip prove what left the machine.

## Supply chain (`aegis update`)

Since v0.10.0, updates install the latest tag's **built release asset** with
installation scripts disabled (`npm install -g --ignore-scripts
https://github.com/Shreyash3007/aegis/releases/download/<tag>/aegis-<version>.tgz`).
Each release publishes a SHA256 sidecar (`aegis-<version>.tgz.sha256`) and a
release-evidence sidecar binding the artifact digest to the tested source
commit; verify the digest against the sidecar before installing on
sensitive machines. The updater itself selects the same built-asset URL and
passes `--ignore-scripts`. The pre-v0.10 path — GitHub's generated
`archive/refs/tags/<tag>.tar.gz` source archives — is deprecated: those
tarballs are not byte-stable, carry no checksum, and historically ran
install scripts. `npm ci` (shrinkwrap) covers dependency installs;
`ts-morph` is the only runtime dependency, bundled into the release asset.

## Supported versions

Only the latest release tag receives fixes. `aegis update` to stay current.
