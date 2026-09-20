# kap-platform

Chart Helm Onyxia pour [KickStarteringAgentPlatform](https://github.com/nic01asFr/KickStarteringAgentPlatform).

## Déploiement

```yaml
platform:
  image:
    repository: nic01asfr/kickstartering-agent-platform
    tag: "1.0.0"
ingress:
  enabled: true
  hostname: ""
```

## Composants

- **Platform** : Next.js standalone sur port 3001
- **Caddy** : reverse proxy sur port 8080

Aucune base de donnée externe n'est nécessaire.