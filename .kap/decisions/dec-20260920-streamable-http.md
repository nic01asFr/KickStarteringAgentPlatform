---
id: dec-20260920-streamable-http
type: decision
title: "Expose KAP MCP over Streamable HTTP with session + Bearer GitHub"
domain: architecture
confidence: 0.9
timestamp: 2026-09-20T11:25:00.000Z
---

Remote agents connect via Streamable HTTP on `/mcp` using the MCP TypeScript SDK transport.
Sessions are stateful (mcp-session-id); Bearer GitHub validates callers. stdio remains the local default.

## Rationale

Multi-user agent collaboration needs a network transport without abandoning the same tool surface as stdio.

## Alternatives rejected

- **Legacy HTTP+SSE**: deprecated in the MCP spec
- **Auth-less public /mcp**: unsafe for write tools
