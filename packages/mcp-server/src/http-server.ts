#!/usr/bin/env node
/**
 * KAP MCP — Streamable HTTP transport
 *
 * Endpoint: POST/GET/DELETE /mcp
 * Auth: Authorization: Bearer <github_token> (set KAP_HTTP_AUTH=false to disable)
 * Also: GET /health, GET /protocol.json
 *
 *   KAP_HTTP_PORT=8787 node dist/http-server.js
 */

import { randomUUID } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import express, { type Request, type Response } from 'express'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import { createKapServer } from './create-kap-server.js'

const PORT = Number(process.env['KAP_HTTP_PORT'] ?? 8787)
const HOST = process.env['KAP_HTTP_HOST'] ?? '0.0.0.0'
const AUTH_REQUIRED = process.env['KAP_HTTP_AUTH'] !== 'false'

/** sessionId → transport */
const transports: Record<string, StreamableHTTPServerTransport> = {}

function protocolPayload(): string {
  const candidates = [
    join(process.cwd(), '.kap', 'protocol.json'),
    join(process.cwd(), 'protocol.json'),
  ]
  for (const p of candidates) {
    if (existsSync(p)) return readFileSync(p, 'utf8')
  }
  return JSON.stringify({
    protocol_version: '0.1.0',
    mcp: { transports: { streamable_http: { status: 'available', path: '/mcp' } } },
  })
}

function getBearer(req: Request): string | null {
  const h = req.headers['authorization']
  if (!h || Array.isArray(h)) return null
  const m = /^Bearer\s+(.+)$/i.exec(h)
  return m?.[1]?.trim() ?? null
}

async function validateGitHubToken(token: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'kap-mcp-http',
      },
    })
    return res.ok
  } catch {
    return false
  }
}

async function requireAuth(req: Request, res: Response): Promise<string | null> {
  if (!AUTH_REQUIRED) return 'auth-disabled'
  const token = getBearer(req)
  if (!token) {
    res.status(401).set('WWW-Authenticate', 'Bearer realm="kap-mcp"').json({
      error: 'missing_bearer',
      hint: 'Authorization: Bearer <github_token>',
    })
    return null
  }
  const ok = await validateGitHubToken(token)
  if (!ok) {
    res.status(403).json({ error: 'invalid_token' })
    return null
  }
  // Make token available for FilePKG optional GitHub push during this process
  if (!process.env['GITHUB_TOKEN'] && !process.env['GITHUB_APP_TOKEN']) {
    process.env['GITHUB_TOKEN'] = token
  }
  return token
}

async function main(): Promise<void> {
  const app = express()
  app.use(express.json({ limit: '4mb' }))

  app.get(['/', '/health'], (_req, res) => {
    res.json({
      ok: true,
      service: 'kap-mcp',
      transport: 'streamable-http',
      sessions: Object.keys(transports).length,
      auth_required: AUTH_REQUIRED,
    })
  })

  app.get('/protocol.json', (_req, res) => {
    res.type('application/json').send(protocolPayload())
  })

  app.all('/mcp', async (req: Request, res: Response) => {
    try {
      const token = await requireAuth(req, res)
      if (token === null) return

      const sessionIdHeader = req.headers['mcp-session-id']
      const sessionId =
        typeof sessionIdHeader === 'string' ? sessionIdHeader : undefined

      // Existing session
      if (sessionId && transports[sessionId]) {
        const transport = transports[sessionId]!
        await transport.handleRequest(req, res, req.body)
        return
      }

      // New session: must be initialize
      if (req.method === 'POST' && isInitializeRequest(req.body)) {
        const server = createKapServer()
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (id: string) => {
            transports[id] = transport
            process.stderr.write(`[kap-mcp-http] session initialized ${id}\n`)
          },
        })

        transport.onclose = () => {
          const id = transport.sessionId
          if (id && transports[id]) {
            delete transports[id]
            process.stderr.write(`[kap-mcp-http] session closed ${id}\n`)
          }
        }

        await server.connect(transport)
        await transport.handleRequest(req, res, req.body)
        return
      }

      // Stateless optional path: POST without session when KAP_HTTP_STATELESS=true
      if (
        process.env['KAP_HTTP_STATELESS'] === 'true' &&
        req.method === 'POST'
      ) {
        const server = createKapServer()
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
        })
        await server.connect(transport)
        await transport.handleRequest(req, res, req.body)
        return
      }

      res.status(400).json({
        error: 'invalid_session',
        hint: 'Send initialize POST to open a session, or include mcp-session-id for an existing one.',
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      process.stderr.write(`[kap-mcp-http] error: ${message}\n`)
      if (!res.headersSent) {
        res.status(500).json({ error: 'internal_error', message })
      }
    }
  })

  app.listen(PORT, HOST, () => {
    process.stderr.write(
      `[kap-mcp-http] Streamable HTTP on http://${HOST}:${PORT}/mcp (auth=${AUTH_REQUIRED})\n`,
    )
  })
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  process.stderr.write(`[kap-mcp-http] fatal: ${message}\n`)
  process.exit(1)
})
