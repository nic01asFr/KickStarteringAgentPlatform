---
id: dec-20260920-protocol-community
type: decision
title: "Protocol 0.1 includes community ideas/votes and HTTP auth path"
domain: product
confidence: 0.9
timestamp: 2026-09-20T11:10:00.000Z
---

KAP protocol 0.1 documents memory paths, MCP tools, community labels (kap-idea / kap-signal / kap-choice), voting via GitHub +1 reactions, and experimental Streamable HTTP with Bearer GitHub (OAuth next).

## Rationale

Agent collaboration on open projects needs shared formats and a standard, low-friction way for humans and agents to propose and rank ideas without a custom ballot backend.

## Alternatives rejected

- **Custom voting database**: ops cost; GitHub reactions are enough for v0.1
- **Pages-only interaction**: weak format enforcement for multi-agent writes
