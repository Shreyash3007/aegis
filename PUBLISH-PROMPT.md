# PUBLISH PROMPT — paste this to Claude Code / Kimi Code

You are publishing the Aegis CLI package. The complete package is in the
current working directory (aegis-cli/ with package.json, src/, dist/, skills/,
templates/, ci-templates/, docs/, README.md, AGENTS.md, SETUP.md, LICENSE).

Do exactly this, in order, and stop on any error:

1. **Initialize the repo** (skip if already a git repo with these files):
   - `git init -b main`
   - Create `.gitignore` containing: `node_modules/` and nothing else
     (do NOT ignore dist/ — git installs build via the `prepare` script,
     but committed dist lets `npm link` work immediately)
   - `git add -A && git commit -m "aegis v0.1.0: runtime + 66 skills"`

2. **Create the remote repo** using the gh CLI (ask me for the org/name if
   not obvious; default name: `aegis`):
   - `gh repo create <org>/aegis --public --source=. --push`
   - If `gh` is unavailable or unauthenticated: print the exact manual steps
     (create repo on github.com, add remote, push) and stop.

3. **Verify git-based install works** in a temp directory:
   - `cd $(mktemp -d) && npm install -g github:<org>/aegis`
   - Confirm `aegis help` prints the command list.
   - If the prepare build fails on install, fix package.json and re-push.

4. **Tag the release**:
   - `git tag v0.1.0 && git push --tags`
   - `gh release create v0.1.0 --title "Aegis v0.1.0" --notes "Initial public release: 21 CLI commands, 66 skill files, merge oracle, eval harness."`

5. **Final verification** (fresh temp project):
   - `git init -b main demo && cd demo`
   - `aegis init --yes` -> confirm .aegis/, brain/, hooks, skills install
   - `aegis eval --all` -> must print 66/66 passed
   - Report the results back to me.

Rules: do not publish to the npm registry without my explicit approval
(GitHub install is enough for now). Do not change any source file's content
except .gitignore creation. Report each completed step with its command output.
