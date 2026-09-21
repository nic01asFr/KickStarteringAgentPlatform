#!/usr/bin/env node
/**
 * KAP MCP — Streamable HTTP transport
 *
 * Auth (when KAP_HTTP_AUTH !== false):
 *   1. Bearer matches KAP_BEARER_TOKEN / BEARER_TOKEN (service token, Onyxia)
 *   2. Or Bearer is a valid GitHub PAT (api.github.com/user)
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

function serviceBearer(): string | null {
  const t =
    process.env['KAP_BEARER_TOKEN'] ??
    process.env['BEARER_TOKEN'] ??
    null
  return t && t.length > 0 ? t : null
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
      hint: 'Authorization: Bearer <service_token_or_github_pat>',
    })
    return null
  }

  const expected = serviceBearer()
  if (expected && token === expected) {
    return token
  }

  const ghOk = await validateGitHubToken(token)
  if (ghOk) {
    if (!process.env['GITHUB_TOKEN'] && !process.env['GITHUB_APP_TOKEN']) {
      process.env['GITHUB_TOKEN'] = token
    }
    return token
  }

  res.status(403).json({
    error: 'invalid_token',
    hint: expected
      ? 'Use the service BEARER_TOKEN from the release Secret, or a valid GitHub PAT'
      : 'Set KAP_BEARER_TOKEN or use a valid GitHub PAT',
  })
  return null
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
      service_bearer_configured: Boolean(serviceBearer()),
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

      if (sessionId && transports[sessionId]) {
        await transports[sessionId]!.handleRequest(req, res, req.body)
        return
      }

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

      if (process.env['KAP_HTTP_STATELESS'] === 'true' && req.method === 'POST') {
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
        hint: 'Send initialize POST to open a session, or include mcp-session-id.',
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
      `[kap-mcp-http] Streamable HTTP on http://${HOST}:${PORT}/mcp (auth=${AUTH_REQUIRED}, service_bearer=${Boolean(serviceBearer())})\n`,
    )
  })
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  process.stderr.write(`[kap-mcp-http] fatal: ${message}\n`)
  process.exit(1)
})
