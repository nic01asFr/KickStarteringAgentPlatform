/**
 * Shared McpServer factory for stdio and Streamable HTTP entrypoints.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerAllTools, isLocalMode } from './tools/index.js'
import { registerResources } from './resources.js'
import { registerPrompts } from './prompts.js'
import { initConfig } from './config.js'

export function createKapServer(): McpServer {
  if (!isLocalMode()) {
    initConfig()
  }

  const server = new McpServer(
    {
      name: 'kap-server',
      version: '0.4.0',
      description: `KAP — project memory for agent collaboration on open projects.

Stores decisions and updates as markdown under .kap/ (git is the database).

TOOLS: kap_pkg_build_context, kap_pkg_write, kap_pkg_query, kap_report_event,
kap_fetch_feedback, kap_escalate_to_admin.

RESOURCES: kap://decisions, kap://vision, kap://signals, kap://artifacts`,
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

  return server
}
