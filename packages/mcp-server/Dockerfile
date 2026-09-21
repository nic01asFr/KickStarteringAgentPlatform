# KAP MCP — Streamable HTTP image for Onyxia / SSPCloud
FROM node:22-bookworm-slim AS build
WORKDIR /app

# Minimal workspace: only mcp-server package
COPY packages/mcp-server/package.json ./package.json
RUN npm install --omit=dev --ignore-scripts 2>/dev/null || npm install --ignore-scripts

COPY packages/mcp-server/tsconfig.json ./tsconfig.json
COPY packages/mcp-server/src ./src
# Standalone tsc without monorepo base config
RUN npx tsc -p tsconfig.json --outDir dist --rootDir src --module NodeNext --moduleResolution NodeNext --target ES2022 --esModuleInterop --skipLibCheck || npx tsc -p tsconfig.json

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV KAP_HTTP_PORT=8787
ENV KAP_HTTP_HOST=0.0.0.0
ENV KAP_DATA_DIR=/data/.kap

RUN useradd -u 1000 -m -s /bin/bash kap \
  && mkdir -p /data/.kap \
  && chown -R kap:kap /data /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/dist ./dist

USER 1000
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.KAP_HTTP_PORT||8787)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/http-server.js"]
