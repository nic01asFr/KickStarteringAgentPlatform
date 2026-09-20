/**
 * MCP Resources — read PKG from .kap/ markdown files.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getFilePKG } from './file-pkg.js'

export function registerResources(server: McpServer): void {
  server.resource(
    'kap-decisions',
    'kap://decisions',
    {
      description:
        'Architectural and technical decisions from .kap/decisions/, newest first.',
      mimeType: 'application/json',
    },
    async (_uri) => {
      const decisions = getFilePKG().getRecentDecisions(20)
      return {
        contents: [
          {
            uri: 'kap://decisions',
            mimeType: 'application/json',
            text: JSON.stringify(decisions, null, 2),
          },
        ],
      }
    },
  )

  server.resource(
    'kap-vision',
    'kap://vision',
    {
      description: 'High-confidence decisions (confidence >= 0.8) as markdown.',
      mimeType: 'text/markdown',
    },
    async (_uri) => {
      const vision = getFilePKG().getProjectVision()
      const md = [
        '# Project vision\n',
        ...vision.map((d) =>
          [
            `## ${d.title}`,
            `**Domain:** ${d.domain} | **Confidence:** ${d.confidence}`,
            '',
            d.description,
            '',
            `**Rationale:** ${d.rationale}`,
            '',
          ].join('\n'),
        ),
      ].join('\n')
      return {
        contents: [{ uri: 'kap://vision', mimeType: 'text/markdown', text: md }],
      }
    },
  )

  server.resource(
    'kap-signals',
    'kap://signals',
    {
      description: 'Signals from .kap/signals/.',
      mimeType: 'application/json',
    },
    async (_uri) => {
      const signals = getFilePKG().getPendingSignals(50)
      return {
        contents: [
          {
            uri: 'kap://signals',
            mimeType: 'application/json',
            text: JSON.stringify({ total: signals.length, signals }, null, 2),
          },
        ],
      }
    },
  )

  server.resource(
    'kap-artifacts',
    'kap://artifacts',
    {
      description: 'Recent public updates from .kap/updates/.',
      mimeType: 'application/json',
    },
    async (_uri) => {
      const updates = getFilePKG().getUpdates(30)
      return {
        contents: [
          {
            uri: 'kap://artifacts',
            mimeType: 'application/json',
            text: JSON.stringify(updates, null, 2),
          },
        ],
      }
    },
  )
}

export async function notifyResourceUpdated(server: McpServer, uri: string): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (server as any).server?.notification({
      method: 'notifications/resources/updated',
      params: { uri },
    })
  } catch {
    /* optional */
  }
}
