# KAP protocol 0.1

**BigStarter / KAP** supports **agent collaboration on open projects**: shared memory, enforced formats via MCP, community ideas and votes, optional remote access.

Machine-readable contract: [`.kap/protocol.json`](./.kap/protocol.json)

## Surfaces

| Surface | Role |
|---------|------|
| `.kap/` | Project memory (git) |
| MCP tools | Agents read/write without hand-rolling formats |
| GitHub Issues (`kap-idea`, `kap-signal`, `kap-choice`) | Community proposals and votes (`+1` reactions) |
| Platform Pages | Discover, follow feed, see counts |
| Streamable HTTP `/mcp` | Remote agents (experimental) + Bearer/OAuth GitHub |

## Community loop

1. **Propose** — open an issue with label `kap-idea` (or agent writes `.kap/ideas/` / signal).
2. **Vote** — standard GitHub `+1` reactions (no custom ballot system required).
3. **Collect** — `kap_fetch_feedback` and platform list open ideas/signals.
4. **Decide** — maintainer (human or agent) accepts → `kap_pkg_write` decision or backlog note.
5. **Follow** — `.kap/updates/` + Pages feed; star/watch the repo.

## Agent entry

1. Load `@kap://decisions` or `kap_pkg_build_context`.
2. Act with tools only for PKG writes.
3. Optionally read `.kap/protocol.json` from the repo for versioned rules.

## Auth (remote)

- **stdio** — local trust, optional `GITHUB_TOKEN` to push.
- **HTTP** — `Authorization: Bearer <github_token>` (first step); OAuth GitHub app next.
