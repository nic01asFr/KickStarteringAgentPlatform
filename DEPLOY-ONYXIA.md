# Déployer KAP MCP sur Onyxia / SSPCloud

## Objectif

Exposer **kap-mcp** comme les autres services nic01asFr : pod + chart Helm + ingress HTTPS + auth, consommable par Atelier / agents en Streamable HTTP.

```
Agent  --Bearer-->  https://kap-mcp-….sspcloud…/mcp  -->  pod kap-http  -->  /data/.kap
```

## Composants

| Élément | Emplacement |
|---------|-------------|
| Image | `packages/mcp-server/Dockerfile` → `ghcr.io/nic01asfr/kap-mcp` |
| Chart | `charts/kap-mcp/` |
| Contrat | `.kap/protocol.json` + `GET /protocol.json` |

## Build image

```bash
docker build -f packages/mcp-server/Dockerfile -t ghcr.io/nic01asfr/kap-mcp:0.4.0 .
docker push ghcr.io/nic01asfr/kap-mcp:0.4.0
```

(CI : étendre `.github/workflows/docker-publish.yml` avec la cible `kap-mcp`.)

## Chart

```bash
cd charts/kap-mcp && helm dependency update && cd ../..
helm upgrade --install kap-mcp ./charts/kap-mcp \
  --namespace <ns-onyxia> \
  --set ingress.hostname=<host> \
  --set security.bearerToken=<secret> \
  --set github.token=<gh_pat>   # optionnel push .kap
```

## OAuth

| Couche | Rôle |
|--------|------|
| **OIDC Onyxia / SSPCloud** | Accès humain au catalogue / éventuellement authn ingress |
| **Bearer service** | Agent MCP (jeton release / oneTimePassword) |
| **GitHub token** | Push Contents API vers repos projets |

OAuth « MCP full » (metadata protected-resource) peut s’ajouter plus tard dans `http-server.ts` ; le chart expose déjà le canal HTTP sécurisé par Bearer.

## Atelier

Enregistrer dans la gateway MCP :

```json
{
  "kap": {
    "url": "https://<ingress>/mcp",
    "headers": { "Authorization": "Bearer <token>" }
  }
}
```
