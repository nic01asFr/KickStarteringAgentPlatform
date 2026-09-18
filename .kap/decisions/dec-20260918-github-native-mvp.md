---
id: dec-20260918-github-native-mvp
type: decision
title: GitHub-native MVP as sole path
rationale: >-
  Zero infra for MVP. Decisions, updates and project identity live in the repo
  under .kap/. MCP reads and writes local files. Platform is static Pages over
  registry.json. No hosted database or queue required to ship the loop.
alternatives_rejected:
  - option: Hosted graph database as primary PKG
    reason: 'Ops cost and onboarding friction for MVP'
  - option: Multi-service cloud deploy as default path
    reason: 'Out of scope until the file-based loop works end to end'
domain: architecture
confidence: 0.95
sprint: 2
timestamp: '2026-09-18T16:00:00.000Z'
---

MVP path is GitHub-native only: `.kap/` in-repo, local MCP, Actions reporter, static platform over `registry.json`.
