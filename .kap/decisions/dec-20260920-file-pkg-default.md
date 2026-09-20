---
id: dec-20260920-file-pkg-default
type: decision
title: "File-based PKG is the default local memory"
domain: architecture
confidence: 0.95
timestamp: 2026-09-20T10:30:00.000Z
---

Local MCP mode writes decisions, updates, and signals as markdown under `.kap/`.
Git is the shared database for agent collaboration on open projects.

## Rationale

Platform Pages and the CI reporter already consume `.kap/*.md`.
Kuzu as default split the agent memory from the public/project truth.
File PKG aligns tools, CI, and the registry-facing surface.

## Alternatives rejected

- **Kuzu default**: required native deps and was invisible to git/platform
- **HTTP backend required for MVP**: ops cost; stdio + files is enough for the first loop
