/**
 * Local-mode tool registrations (GitHub-native MVP).
 *
 * Source of truth: markdown under .kap/ (decisions, updates, signals).
 * Optional: push to GitHub when GITHUB_TOKEN + OWNER + REPO are set.
 * Sampling: editorial text via client LLM when available.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { getFilePKG } from '../file-pkg.js'
import { sampleText } from '../sampling.js'

const projectIdParam = {
  project_id: z
    .string()
    .optional()
    .describe('Optional project id (unused in file mode; kept for compatibility)'),
}

export function registerLocalTools(server: McpServer): void {
  // ----------------------------------------------------------------
  // kap_report_event
  // ----------------------------------------------------------------
  server.tool(
    'kap_report_event',
    `Report a significant development event. Writes an update under .kap/updates/ (git is source of truth).

CALL WHEN: completing a feature, milestone, successful test suite, deployment, or meaningful progress.
DO NOT CALL for trivial commits or WIP steps.`,
    {
      ...projectIdParam,
      event_type: z
        .enum(['commit', 'test_run', 'deploy', 'milestone', 'custom'])
        .describe('Type of event'),
      summary: z.string().describe('Human-readable description of what happened'),
      metadata: z
        .record(z.unknown())
        .optional()
        .describe('Extra data: commit hash, test counts, branch name, etc.'),
    },
    async (args) => {
      const pkg = getFilePKG()
      const recent = pkg.getRecentDecisions(3)
      const decisionsCtx =
        recent.map((d) => `- ${d.title}`).join('\n') || 'none yet'

      let editorial = args.summary
      let publishReady = false

      try {
        const raw = await sampleText(
          server,
          `EVENT: ${args.event_type}
WHAT HAPPENED: ${args.summary}
${args.metadata ? `DETAILS: ${JSON.stringify(args.metadata)}` : ''}

RECENT PROJECT DECISIONS:
${decisionsCtx}

TASK: Write a public project update (2-3 sentences).
RULES:
- Specific and concrete
- No hype words
- No markdown, no links
- Start directly with the content`,
          {
            system: 'You write honest, specific project updates for a developer audience. Plain prose only.',
            model: 'claude-haiku-4-5',
            maxTokens: 220,
          },
        )
        const cleaned = raw.trim().replace(/^[`#*>\-]+/gm, '').trim()
        if (cleaned.length < 20) throw new Error('Editorial too short')
        editorial = cleaned.slice(0, 400)
        publishReady = true
      } catch {
        editorial = args.summary
        publishReady = false
      }

      const written = await pkg.writeUpdate({
        summary: editorial,
        event_type: args.event_type,
      })

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              ok: true,
              id: written.id,
              path: written.path,
              editorial_update: editorial,
              publish_ready: publishReady,
              committed_to_github: written.committed,
              message: written.committed
                ? `Update committed to ${written.path}`
                : `Update written locally to ${written.path}. Commit/push or set GITHUB_TOKEN to publish.`,
            }),
          },
        ],
      }
    },
  )

  // ----------------------------------------------------------------
  // kap_pkg_write
  // ----------------------------------------------------------------
  server.tool(
    'kap_pkg_write',
    `Write a node to the Project Knowledge Graph as markdown under .kap/.

CALL WHEN: significant architectural, technical, or product decision.
Decisions → .kap/decisions/*.md ; signals → .kap/signals/*.md.`,
    {
      ...projectIdParam,
      node_type: z.enum(['decision', 'signal', 'artifact']).describe('Type of node to write'),
      title: z.string().describe('Short title'),
      description: z.string().describe('Full description'),
      rationale: z.string().optional().describe('Why (required for decisions)'),
      domain: z
        .enum(['architecture', 'product', 'technical', 'community', 'financial'])
        .optional()
        .describe('Domain (for decisions)'),
      confidence: z.number().min(0).max(1).optional().describe('Confidence 0–1'),
      alternatives_rejected: z
        .array(z.object({ option: z.string(), reason: z.string() }))
        .optional()
        .describe('Rejected alternatives'),
    },
    async (args) => {
      const pkg = getFilePKG()

      if (args.node_type === 'decision') {
        const written = await pkg.writeDecision({
          title: args.title,
          description: args.description,
          rationale: args.rationale ?? args.description,
          domain: args.domain ?? 'technical',
          confidence: args.confidence ?? 0.8,
          ...(args.alternatives_rejected
            ? { alternatives_rejected: args.alternatives_rejected }
            : {}),
        })
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                ok: true,
                id: written.id,
                node_type: 'decision',
                path: written.path,
                committed_to_github: written.committed,
              }),
            },
          ],
        }
      }

      if (args.node_type === 'signal') {
        const written = await pkg.writeSignal({
          signal_type: 'feature_request',
          content: `${args.title}\n\n${args.description}`,
          source: 'agent',
        })
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                ok: true,
                id: written.id,
                node_type: 'signal',
                path: written.path,
                committed_to_github: written.committed,
              }),
            },
          ],
        }
      }

      // artifact → stored as update-style note under updates/
      const written = await pkg.writeUpdate({
        summary: `${args.title}: ${args.description}`,
        event_type: 'custom',
      })
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              ok: true,
              id: written.id,
              node_type: 'artifact',
              path: written.path,
              committed_to_github: written.committed,
            }),
          },
        ],
      }
    },
  )

  // ----------------------------------------------------------------
  // kap_pkg_build_context
  // ----------------------------------------------------------------
  server.tool(
    'kap_pkg_build_context',
    `Load working context from .kap/decisions and .kap/signals before starting a task.`,
    {
      ...projectIdParam,
      task_description: z.string().describe('What you are about to work on'),
      use_sampling: z
        .boolean()
        .optional()
        .default(true)
        .describe('Generate a smart summary via LLM sampling'),
    },
    async (args) => {
      const pkg = getFilePKG()
      const decisions = pkg.getRecentDecisions(8)
      const signals = pkg.getPendingSignals(5)

      const rawContext = {
        recent_decisions: decisions.map((d) => ({
          title: d.title,
          domain: d.domain,
          rationale: d.rationale,
          confidence: d.confidence,
          path: `.kap/decisions/${d.filename}`,
        })),
        top_signals: signals.map((s) => ({
          content: s.content,
          type: s.signal_type,
          source: s.source,
        })),
      }

      let context_summary = ''
      if (args.use_sampling !== false && (decisions.length > 0 || signals.length > 0)) {
        try {
          context_summary = await sampleText(
            server,
            `Task: "${args.task_description}"

Relevant decisions:
${rawContext.recent_decisions.map((d) => `- ${d.title}: ${d.rationale}`).join('\n') || 'none'}

Pending signals:
${rawContext.top_signals.map((s) => `- [${s.type}] ${s.content}`).join('\n') || 'none'}

In 2-3 sentences, summarize what the agent should know before starting.`,
            {
              system: 'You are a project context summarizer. Be concise and specific.',
              model: 'claude-haiku-4-5',
              maxTokens: 256,
            },
          )
        } catch {
          context_summary = [
            `Task: ${args.task_description}`,
            decisions.length > 0
              ? `Key decisions: ${decisions
                  .slice(0, 3)
                  .map((d) => d.title)
                  .join(', ')}.`
              : '',
          ]
            .filter(Boolean)
            .join(' ')
        }
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              context_summary: context_summary || `Context for: ${args.task_description}`,
              raw: rawContext,
              decisions_count: decisions.length,
              signals_count: signals.length,
            }),
          },
        ],
      }
    },
  )

  // ----------------------------------------------------------------
  // kap_fetch_feedback
  // ----------------------------------------------------------------
  server.tool(
    'kap_fetch_feedback',
    `Retrieve pending signals from .kap/signals/.`,
    {
      ...projectIdParam,
      limit: z.number().int().min(1).max(50).default(10),
    },
    async (args) => {
      const pkg = getFilePKG()
      const signals = pkg.getPendingSignals(args.limit)
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              pending_signals: signals.map((s) => ({
                id: s.id,
                type: s.signal_type,
                content: s.content,
                source: s.source,
              })),
              total_pending: signals.length,
              retrieved_at: new Date().toISOString(),
            }),
          },
        ],
      }
    },
  )

  // ----------------------------------------------------------------
  // kap_pkg_query
  // ----------------------------------------------------------------
  server.tool(
    'kap_pkg_query',
    `Search .kap/decisions by keyword.`,
    {
      ...projectIdParam,
      query: z.string().describe('Keyword or phrase'),
    },
    async (args) => {
      const pkg = getFilePKG()
      const results = pkg.searchDecisions(args.query)
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              results: results.map((d) => ({
                title: d.title,
                domain: d.domain,
                confidence: d.confidence,
                path: `.kap/decisions/${d.filename}`,
              })),
              count: results.length,
            }),
          },
        ],
      }
    },
  )

  // ----------------------------------------------------------------
  // kap_escalate_to_admin
  // ----------------------------------------------------------------
  server.tool(
    'kap_escalate_to_admin',
    `Escalate a decision that exceeds autonomy. Stored under .kap/signals/ and printed to stderr.`,
    {
      ...projectIdParam,
      title: z.string(),
      context: z.string(),
      options: z.array(
        z.object({
          label: z.string(),
          description: z.string(),
          pros: z.array(z.string()),
          cons: z.array(z.string()),
        }),
      ),
      recommendation: z.string(),
      urgency: z.enum(['low', 'medium', 'high', 'critical']),
      impact_if_no_response: z.string(),
    },
    async (args) => {
      const pkg = getFilePKG()
      const written = await pkg.writeSignal({
        signal_type: 'escalation',
        content: `[ESCALATION ${args.urgency.toUpperCase()}] ${args.title}\n\nContext: ${args.context}\n\nRecommendation: ${args.recommendation}\n\nIf no response: ${args.impact_if_no_response}`,
        source: 'agent',
      })

      process.stderr.write(`\n⚠️  KAP ESCALATION [${args.urgency.toUpperCase()}] — ${args.title}\n`)
      process.stderr.write(`Context: ${args.context}\n`)
      process.stderr.write(`Recommendation: ${args.recommendation}\n\n`)

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              escalation_id: written.id,
              path: written.path,
              urgency: args.urgency,
              message: 'Escalation written to .kap/signals/ and surfaced on stderr.',
            }),
          },
        ],
      }
    },
  )
}
