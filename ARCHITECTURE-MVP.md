# BigStarter / KAP — Architecture MVP (GitHub-native)

> **Décision structurante** : le MVP est **100 % GitHub-native**.  
> VPS / Postgres / Kuzu serveur / BullMQ / Vercel / Fly / Supabase = **hors scope MVP** (archivés pour v0.2 éventuelle).  
> Source de vérité : décision `.kap/decisions/dec-…-use-github-as-pkg-backend.md` + séparation BigFatDot.

---

## Ownership

| Rôle | Emplacement |
|------|-------------|
| Repo source | `nic01asFr/KickStarteringAgentPlatform` |
| Registry | `registry.json` (ce repo) |
| Platform | Pages sous `nic01asFr` |
| Legacy | `BigFatDot/BigStarter` — ne plus dépendre |

---

## Principes

1. **Zéro infra** — pas de backend hébergé pour le MVP
2. **Git = audit trail** — décisions, updates, features vivent dans le repo
3. **MCP local (stdio)** — l’agent (Claude Code) parle au projet via `bigstarter`
4. **Platform = site statique** — GitHub Pages lit `registry.json` + `.kap/` des repos listés
5. **Onboarding en 2 clics** — `npx bigstarter init`

---

## Architecture cible

```
Repo GitHub (projet utilisateur)
  └── .kap/
        kap.json              ← identité (name, pitch, owner, repo, tags…)
        decisions/*.md        ← PKG décisions (frontmatter + body)
        updates/*.md          ← feed public d’avancement
        features/             ← (optionnel) features proposées
  └── .github/workflows/
        bigstarter-reporter.yml
  └── .mcp.json               ← gitignored (token GitHub)

MCP bigstarter (local, stdio)
  → lit/écrit .kap/ (fichiers locaux)
  → optionnel : commit/push via GITHUB_TOKEN (Octokit)
  → kap_report_event → fichier dans .kap/updates/
  → kap_pkg_write → fichier dans .kap/decisions/

CI (GitHub Actions)
  → npx bigstarter report  (template, sans clé Anthropic)
  → commit .kap/updates/

Platform (GitHub Pages — nic01asFr)
  → lit registry.json
  → pour chaque projet : fetch kap.json + updates via API GitHub
  → affiche pitch + feed
```

---

## Composants MVP

| Composant | Rôle | Statut cible |
|-----------|------|--------------|
| `packages/mcp-server` (`bigstarter`) | CLI `init` + `report` + serveur MCP | Chemin par défaut = fichiers `.kap/` |
| `packages/github-pkg` | Service PKG GitHub (Issues + files) | Utilisé si token ; sinon local files |
| `packages/pkg` | Interface PKG abstraite | Adapter local-fs prioritaire |
| `.github/workflows/kap-reporter.yml` | Updates auto sur push/PR/release | Template sans LLM obligatoire |
| `apps/platform` | Site statique (Next export) | Consomme registry + `.kap/` |
| `registry.json` | Liste des projets onboardés | Mis à jour par PR depuis `init` |

**Hors MVP** : `apps/api`, `apps/worker`, Kuzu serveur, docker-compose, Caddy, Postgres, Redis, BullMQ, DEPLOYMENT.md cloud.

---

## Critères « ça fonctionne »

1. `npx bigstarter init` dans un repo vide → structure `.kap/` + workflow
2. `kap_pkg_write` crée un fichier lisible dans `.kap/decisions/`
3. `kap_report_event` ou `npx bigstarter report` crée une entrée dans `.kap/updates/`
4. La platform affiche le projet (via registry) avec pitch + au moins une update
5. Un second repo (ex. Widgets-Grist) peut être onboardé de la même façon

---

## Mapping des docs

| Document | Rôle |
|----------|------|
| **ARCHITECTURE-MVP.md** | Source de vérité MVP |
| CONCEPT.md | Vision produit |
| ARCHITECTURE.md | Legacy VPS/Kuzu |
| DEPLOYMENT.md | Legacy cloud |
| README.md | Onboarding GitHub-native |

*Figé pour le MVP. Toute évolution d’infra = v0.2 explicite.*
