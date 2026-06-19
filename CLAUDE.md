# CLAUDE.md

Project-specific instructions for Claude Code. Read in addition to [AGENTS.md](AGENTS.md).

## Deploy & verification workflow (STRICT)

**Do not run a local dev server (`npm run dev`, `pnpm dev`, etc) to let me "look at" changes.**
**Do not host anything on `localhost` for me to verify.**

Production is on **Vercel** with Git auto-deploy from `main`. The workflow is:

1. Make the code change.
2. Run `npx tsc -p web --noEmit` (and any other static checks that already exist) — verify it compiles.
3. Commit and push directly to `main` — no PRs, no feature branches, no local preview round-trip.
4. Vercel deploys automatically. I (the user) will look at the live site.

If the code change has visual or runtime risk you cannot statically verify, **say so explicitly** in the chat reply ("I can't verify this without running it; pushing to main now — please test on Vercel"). Do not silently ship and do not stall waiting for local QA.

### What this means in practice

- ✅ Edit → typecheck → `git add` specific files → `git commit` → `git push origin main`
- ❌ Edit → start dev server → tell me to open `http://localhost:3000`
- ❌ Edit → create a branch → open a PR
- ❌ Edit → wait for me to "test it locally"

If a previously started `npm run dev` is still running from an earlier session, you can leave it — but do not start a new one for the purpose of verification.

### Exceptions (the ONLY ones)

- I explicitly ask: "run it locally" / "open localhost" / "start the dev server"
- The change is to local-only tooling (build scripts, codegen) that wouldn't show up on Vercel anyway

### Commit message style

Conventional commits, matching existing history:
- `feat(web): ...`, `fix(web): ...`, `refactor(web): ...`, `chore: ...`
- Body in English or 中文, multi-line OK via heredoc.
- No Co-Authored-By trailer (per global git config).

### Push directly to `main`

The user is the only committer. `main` is the deploy branch. No PR workflow.
Treat `git push origin main` the same as `git push origin <feature>` would be elsewhere — it's the normal path, not the dangerous one.

The general "ask before destructive actions" rule still applies: confirm before `git reset --hard`, force-push, rewriting history, deleting branches, etc.

## Cursor / 其他 Agent

- Agent 編排：[`docs/AGENT-WORKFLOW.md`](docs/AGENT-WORKFLOW.md) · Domain：[`docs/AGENT-DOMAIN.md`](docs/AGENT-DOMAIN.md)
- 同等條文（繁中、always-on）：[`.cursor/rules/vercel-main-ship.mdc`](.cursor/rules/vercel-main-ship.mdc)
- 里程碑文件同步：[`.cursor/rules/plan-ship-docs.mdc`](.cursor/rules/plan-ship-docs.mdc)

## Reference

- Dev / build / token commands: [AGENTS.md](AGENTS.md)
- 貢獻與出貨（繁中摘要）：[CONTRIBUTING.md](CONTRIBUTING.md)
- Design system & brand: [DESIGN.md](DESIGN.md)
