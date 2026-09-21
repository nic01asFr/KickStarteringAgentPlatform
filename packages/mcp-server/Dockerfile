# KAP MCP — Streamable HTTP image for Onyxia / SSPCloud
# Build context: repository root
FROM node:22-bookworm-slim AS build
WORKDIR /app

# Runtime deps only (no monorepo, no native kuzu required for HTTP file-pkg path)
COPY packages/mcp-server/package.json ./package.json
RUN node -e "const p=require('./package.json'); delete p.dependencies.kuzu; p.devDependencies={typescript:'^5.4.0',esbuild:'^0.25.0'}; require('fs').writeFileSync('package.json', JSON.stringify(p,null,2));" \
  && npm install

COPY packages/mcp-server/src ./src

# Bundle HTTP entry (resolves TS, externalizes node_modules)
RUN npx esbuild src/http-server.ts \
  --bundle \
  --platform=node \
  --format=esm \
  --outfile=dist/http-server.js \
  --packages=external \
  --banner:js="import { createRequire } from 'module'; const require = createRequire(import.meta.url);"

# Verify artifact
RUN test -f dist/http-server.js && node --check dist/http-server.js

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV KAP_HTTP_PORT=8787
ENV KAP_HTTP_HOST=0.0.0.0
ENV KAP_DATA_DIR=/data/.kap

# node image already has uid 1000 (user "node")
RUN mkdir -p /data/.kap && chown -R node:node /data /app

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/dist ./dist

USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.KAP_HTTP_PORT||8787)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/http-server.js"]
