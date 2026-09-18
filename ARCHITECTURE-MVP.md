# BigStarter / KAP — Architecture MVP (GitHub-native)

> **Décision structurante** : le MVP est **100 % GitHub-native**.  
> VPS / Postgres / Kuzu serveur / BullMQ / Vercel / Fly / Supabase = **hors scope MVP** (archivés pour v0.2 éventuelle).

---

## Principes

1. **Zéro infra** — pas de backend hébergé pour le MVP
2. **Git = audit trail** — décisions, updates, features vivent dans le repo
3. **MCP local (stdio)** — l’agent parle au projet via `bigstarter`
4. **Platform = site statique** — GitHub Pages lit `registry.json` + `.kap/` des repos listés
5. **Onboarding en 2 clics** — `npx bigstarter init`

---

## Architecture cible

```
Repo GitHub (projet utilisateur)
  └── .kap/
        kap.json              ← identité (name, pitch, owner, repo, tags…)
        decisions/*.md        ← PKG décisions
        updates/*.md          ← feed public d’avancement
        features/             ← (optionnel)
  └── .github/workflows/
        bigstarter-reporter.yml
  └── .mcp.json               ← gitignored (token GitHub)

MCP bigstarter (local, stdio)
  → lit/écrit .kap/ (fichiers locaux)
  → optionnel : commit/push via GITHUB_TOKEN
  → kap_report_event → .kap/updates/
  → kap_pkg_write → .kap/decisions/

CI (GitHub Actions)
  → npx bigstarter report  (template, sans clé LLM obligatoire)
  → commit .kap/updates/

Platform (GitHub Pages)
  → lit registry.json
  → fetch kap.json + updates via API GitHub
  → affiche pitch + feed
```

---

## Composants MVP

| Composant | Rôle |
|-----------|------|
| `packages/mcp-server` (`bigstarter`) | CLI `init` + `report` + serveur MCP ; défaut = fichiers `.kap/` |
| `packages/github-pkg` | Service PKG GitHub si token |
| `packages/pkg` | Interface PKG ; adapter local-fs prioritaire |
| Workflow reporter | Updates auto sur push / PR / release |
| `apps/platform` | Site statique (Next export) |
| `registry.json` | Liste des projets onboardés |

**Hors MVP** : `apps/api`, `apps/worker`, Kuzu serveur, docker-compose, Postgres, Redis, BullMQ, déploiement cloud multi-services.

---

## Critères « ça fonctionne »

1. `npx bigstarter init` → structure `.kap/` + workflow
2. `kap_pkg_write` → fichier dans `.kap/decisions/`
3. `kap_report_event` ou `npx bigstarter report` → entrée dans `.kap/updates/`
4. La platform affiche le projet (registry) avec pitch + update
5. Un second repo peut être onboardé de la même façon

---

## Docs

| Document | Rôle |
|----------|------|
| **ARCHITECTURE-MVP.md** | Source de vérité MVP |
| CONCEPT.md | Vision produit |
| ARCHITECTURE.md | Legacy (post-MVP) |
| DEPLOYMENT.md | Legacy (post-MVP) |
| README.md | Onboarding |

*Figé pour le MVP. Toute évolution d’infra = v0.2 explicite.*
