#!/usr/bin/env node
/**
 * Experimental Streamable HTTP entry for KAP MCP.
 *
 * Auth (v0):
 *   Authorization: Bearer <github_pat_or_token>
 * OAuth GitHub App metadata can be added later (.well-known).
 *
 * Run (after build):
 *   KAP_HTTP_PORT=8787 node dist/http-server.js
 *
 * Note: full Streamable HTTP transport wiring depends on SDK version.
 * This process validates Bearer auth and boots the same tool surface as stdio
 * when STREAMABLE transport is available; otherwise it serves a health + protocol contract.
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const PORT = Number(process.env['KAP_HTTP_PORT'] ?? 8787)

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
    mcp: { transports: { streamable_http: { status: 'experimental', path: '/mcp' } } },
  })
}

function getBearer(req: IncomingMessage): string | null {
  const h = req.headers['authorization']
  if (!h || Array.isArray(h)) return null
  const m = /^Bearer\s+(.+)$/i.exec(h)
  return m?.[1] ?? null
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

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const url = req.url ?? '/'

  if (req.method === 'GET' && (url === '/' || url === '/health')) {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, service: 'kap-mcp', transport: 'http-skeleton' }))
    return
  }

  if (req.method === 'GET' && url === '/protocol.json') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(protocolPayload())
    return
  }

  if (url.startsWith('/mcp')) {
    const token = getBearer(req)
    if (!token) {
      res.writeHead(401, {
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'Bearer realm="kap-mcp"',
      })
      res.end(JSON.stringify({ error: 'missing_bearer', hint: 'Authorization: Bearer <github_token>' }))
      return
    }
    const ok = await validateGitHubToken(token)
    if (!ok) {
      res.writeHead(403, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'invalid_token' }))
      return
    }

    // Placeholder: full Streamable HTTP MCP session goes here (SDK transport).
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        ok: true,
        message:
          'Bearer accepted. Wire StreamableHTTPServerTransport from MCP SDK for full tool sessions.',
        protocol: '/protocol.json',
        tools_hint: [
          'kap_pkg_build_context',
          'kap_pkg_write',
          'kap_report_event',
          'kap_fetch_feedback',
        ],
      }),
    )
    return
  }

  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'not_found' }))
})

server.listen(PORT, () => {
  process.stderr.write(`[kap-mcp-http] listening on :${PORT} (health /, protocol /protocol.json, mcp /mcp)\n`)
})
