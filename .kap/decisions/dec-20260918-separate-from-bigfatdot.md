---
id: dec-20260918-separate-from-bigfatdot
type: decision
title: Separate KAP/BigStarter from BigFatDot org
rationale: >-
  Own product under nic01asFr. BigFatDot was a branding experiment; the source
  of truth and registry must live on the personal account to keep write access,
  coherent ecosystem presentation, and independence from the org.
alternatives_rejected:
  - option: Keep publishing under BigFatDot
    reason: 'No reliable write path from nic01asFr tooling; splits identity'
  - option: Dual-home forever
    reason: 'Docs and registry drift; platform shows empty projects'
domain: architecture
confidence: 0.98
sprint: 2
timestamp: '2026-09-18T14:50:00.000Z'
---

KAP / BigStarter is owned and operated under **nic01asFr**.

- Source repo: `nic01asFr/KickStarteringAgentPlatform` (may later be renamed or mirrored as public `nic01asFr/BigStarter`)
- Registry: this repo's `registry.json`
- Platform target: `nic01asFr.github.io/...` (or Pages on this repo), not `bigfatdot.github.io`
- npm package `bigstarter`: re-point homepage/repository to nic01asFr when publishing next version
- `BigFatDot/BigStarter`: treat as legacy mirror; do not depend on it for MVP
