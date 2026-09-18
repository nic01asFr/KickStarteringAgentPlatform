# BigStarter

**The Kickstarter for Vibe Coding** — a local MCP plugin that lets AI-assisted projects build in public.

Open protocol · GitHub native · No backend

## What it does

- Records architectural decisions in `.kap/decisions/` in your GitHub repo
- Generates public updates after commits / milestones (CI template + optional LLM sampling)
- Reads community signals from GitHub Issues
- Lists projects on the platform Pages for this repo

## Install

```bash
npx bigstarter init
```

Creates:

| File | Purpose |
|------|---------|
| `.kap/kap.json` | Project metadata (committed) |
| `.mcp.json` | MCP config + GitHub token (**gitignored**) |
| `.github/workflows/bigstarter-reporter.yml` | Auto-updates on push / PR / release |

Optionally opens a PR on the [registry](./registry.json) so the project appears on the platform.

## Configure in Claude Code

Global config (`~/.claude/settings.json`):

```json
{
  "env": {
    "GITHUB_TOKEN": "ghp_xxx"
  },
  "mcpServers": {
    "bigstarter": {
      "command": "npx",
      "args": ["bigstarter"]
    }
  }
}
```

BigStarter auto-detects `GITHUB_OWNER`, `GITHUB_REPO`, and project id from:

1. `.kap/kap.json` (authoritative)
2. `git remote get-url origin` (fallback)
3. Directory name (last resort)

## MCP tools

| Tool | When to use |
|------|-------------|
| `kap_report_event` | After commits, milestones, deploys |
| `kap_pkg_write` | After architectural decisions |
| `kap_pkg_build_context` | At session start |
| `kap_fetch_feedback` | Before sprint planning |
| `kap_pkg_query` | Before implementing a known pattern |
| `kap_escalate_to_admin` | When a decision exceeds autonomy |

## Resources (via @mention)

- `@kap://decisions` — recent architectural decisions
- `@kap://vision` — project vision
- `@kap://signals` — community signals

## Architecture (MVP)

See **[ARCHITECTURE-MVP.md](./ARCHITECTURE-MVP.md)**.

Summary:

```
Repo → .kap/ (decisions + updates)
  ↑
MCP bigstarter (local stdio)
  ↑
Claude Code / any MCP client

CI: bigstarter report → .kap/updates/
Platform: GitHub Pages ← registry.json + .kap/
```

No VPS, no Postgres, no Kuzu server for the MVP. Git is the database.

## Ownership

**Source of truth:** [`nic01asFr/KickStarteringAgentPlatform`](https://github.com/nic01asFr/KickStarteringAgentPlatform)  
**Registry:** [`registry.json`](./registry.json) in this repo  
**Platform target:** Pages on this account (not BigFatDot)

`BigFatDot/BigStarter` is legacy and not required for the MVP.

## License

MIT
