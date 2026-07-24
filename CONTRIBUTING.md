# Contributing to Aegis

Thanks for your interest. Aegis is young and single-maintainer — the most
valuable contributions right now are **real-world trials**, not code.

## The most useful thing you can do

Run Aegis against a real repo and report what actually happened:

1. Install: `npm install -g https://github.com/Shreyash3007/aegis/archive/refs/tags/v0.5.2.tar.gz`
2. `cd your-repo && aegis init --yes`
3. Use it for real work, then open an issue with: what broke, what felt wrong,
   what was missing, and the exact commands/output. Honest UNMEASURED beats
   a polished story — that's the house rule too.

Every release so far was driven by exactly this kind of trial (see the
release notes). Yours could shape the next one.

## If you want to send code

```bash
git clone https://github.com/Shreyash3007/aegis.git && cd aegis
npm install && npm run build   # strict tsc, dist/ is committed
npm test                       # 101 integration tests, no extra deps
node dist/cli.js eval --all    # 68/68 skill files must pass
```

Rules that will get a PR accepted:

- **Tests are integration tests** spawning `dist/cli.js` in throwaway git
  repos (`test/helpers.js`). Every behavior change needs one.
- **No new runtime dependencies.** ts-morph is the only one, deliberately.
- **Honesty contract:** every reported metric cites tool + command or is
  labeled UNMEASURED. Never fake a pass; degrade honestly.
- **Skill files** must pass `aegis eval --all` (all 15 sections, real CLI
  refs, no vague markers).
- **Enforcement in code, judgment in skills** — don't blur the line.
- Keep diffs scoped. No drive-by refactors.

## Reporting security issues

Please see [SECURITY.md](SECURITY.md) — don't open public issues for
vulnerabilities.
