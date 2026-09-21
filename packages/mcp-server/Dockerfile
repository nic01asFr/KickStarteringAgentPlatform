# KAP MCP — Streamable HTTP image (Onyxia / SSPCloud)
# Context: repo root. Self-contained CJS bundle.
FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY packages/mcp-server/package.json ./package.json
RUN node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync('package.json','utf8')); delete p.dependencies.kuzu; p.devDependencies={esbuild:'^0.25.0'}; fs.writeFileSync('package.json', JSON.stringify(p,null,2));" \
  && npm install

COPY packages/mcp-server/src ./src

RUN mkdir -p dist \
  && npx esbuild src/http-server.ts \
       --bundle \
       --platform=node \
       --target=node22 \
       --format=cjs \
       --outfile=dist/http-server.cjs \
  && test -s dist/http-server.cjs \
  && wc -c dist/http-server.cjs

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV KAP_HTTP_PORT=8787
ENV KAP_HTTP_HOST=0.0.0.0
ENV KAP_DATA_DIR=/data/.kap

RUN mkdir -p /data/.kap && chown -R node:node /data /app

COPY --from=build --chown=node:node /app/dist/http-server.cjs ./http-server.cjs

USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.KAP_HTTP_PORT||8787)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "http-server.cjs"]
