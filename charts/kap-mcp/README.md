# Chart Helm `kap-mcp`

Service Onyxia / SSPCloud : **KAP MCP** (Streamable HTTP) pour la collaboration d’agents sur des projets ouverts.

## Dépendance

- [library-chart](https://inseefrlab.github.io/helm-charts-interactive-services) InseeFrLab (labels, annotations ingress Onyxia)

```bash
helm dependency update charts/kap-mcp
```

## Install locale / cluster

```bash
helm upgrade --install kap-mcp ./charts/kap-mcp \
  --set ingress.hostname=kap-mcp.example.com \
  --set security.bearerToken=change-me \
  --set service.image.repository=ghcr.io/nic01asfr/kap-mcp \
  --set service.image.tag=0.4.0
```

## Endpoints

| Path | Rôle |
|------|------|
| `/mcp` | Streamable HTTP MCP |
| `/health` | Liveness |
| `/protocol.json` | Contrat KAP |

Auth : `Authorization: Bearer <security.bearerToken>`.

## Onyxia

1. Publier le chart dans un catalogue (ou OCI) pointé par le compte.
2. L’utilisateur lance le service : hostname + oneTimePassword → Bearer.
3. Brancher l’URL `https://…/mcp` dans Atelier / client MCP.

OAuth plateforme (OIDC SSPCloud) se place typiquement **devant** l’ingress (auth proxy) ; le Bearer reste le secret de service partagé avec l’agent.
