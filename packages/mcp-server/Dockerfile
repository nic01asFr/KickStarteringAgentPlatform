# KAP MCP — Streamable HTTP image for Onyxia / SSPCloud
FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY packages/mcp-server/package.json ./package.json
RUN npm install --ignore-scripts

COPY packages/mcp-server/tsconfig.json ./tsconfig.json
COPY packages/mcp-server/src ./src
# Compile without monorepo base config (image is package-scoped)
RUN npx tsc --outDir dist --rootDir src --module NodeNext --moduleResolution NodeNext \
      --target ES2022 --esModuleInterop --skipLibCheck --declaration false \
      src/index.ts src/http-server.ts src/create-kap-server.ts src/file-pkg.ts \
      src/config.ts src/resources.ts src/prompts.ts src/sampling.ts src/api-client.ts \
      src/types.ts src/tools/index.ts src/tools/local.ts src/tools/events.ts \
      src/tools/pkg.ts src/tools/governance.ts src/tools/escalation.ts src/tools/agents.ts \
      src/cli/init.ts src/cli/smoke-file-pkg.ts \
  || npx tsc -p tsconfig.json --outDir dist --rootDir src --skipLibCheck

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV KAP_HTTP_PORT=8787
ENV KAP_HTTP_HOST=0.0.0.0
ENV KAP_DATA_DIR=/data/.kap

# node image already provides uid 1000 (user "node")
RUN mkdir -p /data/.kap && chown -R node:node /data /app

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/dist ./dist

USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.KAP_HTTP_PORT||8787)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/http-server.js"]
