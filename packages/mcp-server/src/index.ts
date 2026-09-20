#!/usr/bin/env node
/**
 * KAP MCP Server — stdio entrypoint.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createKapServer } from './create-kap-server.js'
import { isLocalMode } from './tools/index.js'

async function main(): Promise<void> {
  const server = createKapServer()
  const transport = new StdioServerTransport()
  await server.connect(transport)

  const mode = isLocalMode() ? 'local (.kap markdown files)' : 'remote (HTTP backend tools)'
  process.stderr.write(`[kap-mcp-server] started — stdio — mode: ${mode}\n`)
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  process.stderr.write(`[kap-mcp-server] fatal: ${message}\n`)
  process.exit(1)
})
