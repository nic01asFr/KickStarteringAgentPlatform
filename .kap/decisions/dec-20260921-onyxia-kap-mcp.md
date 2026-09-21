---
id: dec-20260921-onyxia-kap-mcp
type: decision
title: "Deploy KAP MCP as Onyxia service (Helm + image)"
domain: architecture
confidence: 0.9
timestamp: 2026-09-21T10:35:00.000Z
---

KAP MCP is packaged as a container and Helm chart (library-chart InseeFrLab) for SSPCloud Onyxia, same pattern as n8n-onyxia: ingress HTTPS, Bearer token, PVC for .kap data.

## Rationale

Agents on the user account need a stable remote MCP URL with auth, not only local stdio.

## Alternatives rejected

- **stdio-only on Atelier host**: no multi-session / multi-device
- **Reuse n8n MCP sidecar**: different protocol surface; KAP is project-memory specific
