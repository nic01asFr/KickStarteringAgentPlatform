/**
 * KAP MCP Server — central tool registration.
 *
 * Default (MVP): local file PKG under .kap/
 * Remote: KAP_API_URL=https://... → HTTP backend tool groups
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerEventTools } from './events.js'
import { registerCommunityTools } from './governance.js'
import { registerPKGTools } from './pkg.js'
import { registerEscalationTools } from './escalation.js'
import { registerAgentTools } from './agents.js'
import { registerLocalTools } from './local.js'

export function isLocalMode(): boolean {
  const url = process.env['KAP_API_URL']
  return !url || url === 'local'
}

export function registerAllTools(server: McpServer): void {
  if (isLocalMode()) {
    registerLocalTools(server)
  } else {
    registerEventTools(server)
    registerCommunityTools(server)
    registerPKGTools(server)
    registerEscalationTools(server)
    registerAgentTools(server)
  }
}
