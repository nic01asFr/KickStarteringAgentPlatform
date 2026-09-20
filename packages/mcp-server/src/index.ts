#!/usr/bin/env node
/**
 * KAP MCP Server — entrypoint.
 *
 * LOCAL (default): .kap/ markdown files + optional GitHub push + sampling
 * REMOTE (KAP_API_URL=https://...): HTTP backend
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { initConfig } from './config.js'
import { registerAllTools, isLocalMode } from './tools/index.js'
import { registerResources } from './resources.js'
import { registerPrompts } from './prompts.js'

async function main(): Promise<void> {
  if (!isLocalMode()) {
    initConfig()
  }

  const server = new McpServer(
    {
      name: 'kap-server',
      version: '0.3.0',
      description: `KAP — project memory and build-in-public updates.

LOCAL MODE stores decisions and updates as markdown under .kap/ (git is the database).

USE THESE TOOLS WHEN:
- Starting a session (kap_pkg_build_context)
- Recording a significant decision (kap_pkg_write)
- Completing a milestone (kap_report_event)
- Checking community signals (kap_fetch_feedback)
- Searching past decisions (kap_pkg_query)
- Escalating beyond autonomy (kap_escalate_to_admin)

RESOURCES:
- @kap://decisions, @kap://vision, @kap://signals, @kap://artifacts`,
    },
    {
      capabilities: {
        tools: { listChanged: true },
        resources: { subscribe: false, listChanged: true },
        prompts: { listChanged: false },
        logging: {},
        experimental: { sampling: {} },
      },
    },
  )

  registerAllTools(server)

  if (isLocalMode()) {
    registerResources(server)
    registerPrompts(server)
  }

  const transport = new StdioServerTransport()
  await server.connect(transport)

  const mode = isLocalMode()
    ? 'local (.kap markdown files)'
    : 'remote (HTTP backend)'
  process.stderr.write(`[kap-mcp-server] started — mode: ${mode}\n`)
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  process.stderr.write(`[kap-mcp-server] fatal: ${message}\n`)
  process.exit(1)
})
