/**
 * File-based PKG — GitHub-native MVP source of truth.
 *
 * Layout (committed to git):
 *   .kap/kap.json
 *   .kap/decisions/*.md
 *   .kap/updates/*.md
 *   .kap/signals/*.md   (optional, local escalations / community)
 *
 * Always writes to the local working tree. Optionally pushes via GitHub
 * Contents API when GITHUB_TOKEN + GITHUB_OWNER + GITHUB_REPO are set.
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { ulid } from 'ulid'

export interface DecisionRecord {
  id: string
  title: string
  description: string
  rationale: string
  domain: string
  confidence: number
  alternatives_rejected: { option: string; reason: string }[]
  timestamp: string
  filename: string
}

export interface UpdateRecord {
  id: string
  summary: string
  event_type: string
  date: string
  filename: string
}

export interface SignalRecord {
  id: string
  signal_type: string
  content: string
  source: string
  timestamp: string
  filename: string
}

function kapRoot(): string {
  return process.env['KAP_DATA_DIR'] ?? join(process.cwd(), '.kap')
}

function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true })
}

function slugify(s: string, max = 40): string {
  return s
    .slice(0, max)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'item'
}

function parseFrontmatter(raw: string): { fm: Record<string, string>; body: string } {
  const fm: Record<string, string> = {}
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(raw)
  if (!match) return { fm, body: raw.trim() }
  for (const line of (match[1] ?? '').split('\n')) {
    const sep = line.indexOf(':')
    if (sep === -1) continue
    const key = line.slice(0, sep).trim()
    const value = line.slice(sep + 1).trim().replace(/^["']|["']$/g, '')
    fm[key] = value
  }
  return { fm, body: (match[2] ?? '').trim() }
}

async function maybePushToGitHub(relPath: string, content: string, message: string): Promise<boolean> {
  const token = process.env['GITHUB_TOKEN'] ?? process.env['GITHUB_APP_TOKEN']
  const owner = process.env['GITHUB_OWNER']
  const repo = process.env['GITHUB_REPO']
  if (!token || !owner || !repo) return false

  try {
    const { Octokit } = await import('@octokit/rest')
    const octokit = new Octokit({ auth: token })
    let sha: string | undefined
    try {
      const existing = await octokit.repos.getContent({ owner, repo, path: relPath })
      if (!Array.isArray(existing.data) && 'sha' in existing.data) {
        sha = existing.data.sha
      }
    } catch {
      /* new file */
    }
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: relPath,
      message,
      content: Buffer.from(content).toString('base64'),
      ...(sha ? { sha } : {}),
    })
    return true
  } catch {
    return false
  }
}

export class FilePKG {
  private root: string

  constructor(root?: string) {
    this.root = root ?? kapRoot()
    ensureDir(this.root)
    ensureDir(join(this.root, 'decisions'))
    ensureDir(join(this.root, 'updates'))
    ensureDir(join(this.root, 'signals'))
  }

  async writeDecision(opts: {
    title: string
    description: string
    rationale: string
    domain: string
    confidence: number
    alternatives_rejected?: { option: string; reason: string }[]
  }): Promise<{ id: string; filename: string; path: string; committed: boolean }> {
    const id = ulid()
    const date = new Date().toISOString().slice(0, 10)
    const filename = `dec-${date}-${slugify(opts.title)}.md`
    const relPath = `.kap/decisions/${filename}`
    const abs = join(this.root, 'decisions', filename)
    const alts = opts.alternatives_rejected ?? []
    const content = [
      '---',
      `id: ${id}`,
      `type: decision`,
      `title: ${JSON.stringify(opts.title)}`,
      `domain: ${opts.domain}`,
      `confidence: ${opts.confidence}`,
      `timestamp: ${new Date().toISOString()}`,
      '---',
      '',
      opts.description,
      '',
      '## Rationale',
      '',
      opts.rationale,
      '',
      ...(alts.length
        ? [
            '## Alternatives rejected',
            '',
            ...alts.map((a) => `- **${a.option}**: ${a.reason}`),
            '',
          ]
        : []),
    ].join('\n')

    writeFileSync(abs, content, 'utf8')
    const committed = await maybePushToGitHub(
      relPath,
      content,
      `kap: decision "${opts.title.slice(0, 60)}"`,
    )
    return { id, filename, path: relPath, committed }
  }

  async writeUpdate(opts: {
    summary: string
    event_type: string
    artifact_id?: string
  }): Promise<{ id: string; filename: string; path: string; committed: boolean }> {
    const id = ulid()
    const date = new Date().toISOString().slice(0, 10)
    const filename = `${date}-${slugify(opts.summary)}.md`
    const relPath = `.kap/updates/${filename}`
    const abs = join(this.root, 'updates', filename)
    const content = [
      '---',
      `id: ${id}`,
      `date: "${new Date().toISOString()}"`,
      `event_type: "${opts.event_type}"`,
      ...(opts.artifact_id ? [`artifact_id: "${opts.artifact_id}"`] : []),
      '---',
      '',
      opts.summary,
      '',
    ].join('\n')

    writeFileSync(abs, content, 'utf8')
    const committed = await maybePushToGitHub(
      relPath,
      content,
      `kap: update "${opts.summary.slice(0, 60)}"`,
    )
    return { id, filename, path: relPath, committed }
  }

  async writeSignal(opts: {
    signal_type: string
    content: string
    source?: string
  }): Promise<{ id: string; filename: string; path: string; committed: boolean }> {
    const id = ulid()
    const date = new Date().toISOString().slice(0, 10)
    const filename = `sig-${date}-${id.slice(0, 8)}.md`
    const relPath = `.kap/signals/${filename}`
    const abs = join(this.root, 'signals', filename)
    const content = [
      '---',
      `id: ${id}`,
      `type: signal`,
      `signal_type: ${opts.signal_type}`,
      `source: ${opts.source ?? 'agent'}`,
      `timestamp: ${new Date().toISOString()}`,
      '---',
      '',
      opts.content,
      '',
    ].join('\n')

    writeFileSync(abs, content, 'utf8')
    const committed = await maybePushToGitHub(
      relPath,
      content,
      `kap: signal ${opts.signal_type}`,
    )
    return { id, filename, path: relPath, committed }
  }

  getRecentDecisions(limit = 10): DecisionRecord[] {
    const dir = join(this.root, 'decisions')
    if (!existsSync(dir)) return []
    const files = readdirSync(dir).filter((f) => f.endsWith('.md')).sort().reverse()
    const out: DecisionRecord[] = []
    for (const filename of files.slice(0, limit)) {
      const raw = readFileSync(join(dir, filename), 'utf8')
      const { fm, body } = parseFrontmatter(raw)
      const rationaleMatch = /## Rationale\n\n([\s\S]*?)(?=\n## |$)/.exec(body)
      out.push({
        id: fm['id'] ?? filename,
        title: fm['title'] ?? filename.replace(/\.md$/, ''),
        description: body.split('## Rationale')[0]?.trim() ?? body,
        rationale: (rationaleMatch?.[1] ?? fm['rationale'] ?? '').trim(),
        domain: fm['domain'] ?? 'general',
        confidence: Number(fm['confidence'] ?? 0.5),
        alternatives_rejected: [],
        timestamp: fm['timestamp'] ?? '',
        filename,
      })
    }
    return out
  }

  getUpdates(limit = 20): UpdateRecord[] {
    const dir = join(this.root, 'updates')
    if (!existsSync(dir)) return []
    const files = readdirSync(dir).filter((f) => f.endsWith('.md')).sort().reverse()
    return files.slice(0, limit).map((filename) => {
      const raw = readFileSync(join(dir, filename), 'utf8')
      const { fm, body } = parseFrontmatter(raw)
      return {
        id: fm['id'] ?? filename,
        summary: body.slice(0, 400),
        event_type: fm['event_type'] ?? 'custom',
        date: fm['date'] ?? '',
        filename,
      }
    })
  }

  getPendingSignals(limit = 20): SignalRecord[] {
    const dir = join(this.root, 'signals')
    if (!existsSync(dir)) return []
    const files = readdirSync(dir).filter((f) => f.endsWith('.md')).sort().reverse()
    return files.slice(0, limit).map((filename) => {
      const raw = readFileSync(join(dir, filename), 'utf8')
      const { fm, body } = parseFrontmatter(raw)
      return {
        id: fm['id'] ?? filename,
        signal_type: fm['signal_type'] ?? 'note',
        content: body,
        source: fm['source'] ?? 'agent',
        timestamp: fm['timestamp'] ?? '',
        filename,
      }
    })
  }

  searchDecisions(keyword: string): DecisionRecord[] {
    const kw = keyword.toLowerCase()
    return this.getRecentDecisions(50).filter(
      (d) =>
        d.title.toLowerCase().includes(kw) ||
        d.description.toLowerCase().includes(kw) ||
        d.rationale.toLowerCase().includes(kw) ||
        d.domain.toLowerCase().includes(kw),
    )
  }

  getProjectVision(): DecisionRecord[] {
    return this.getRecentDecisions(50).filter((d) => d.confidence >= 0.8)
  }
}

let singleton: FilePKG | null = null

export function getFilePKG(): FilePKG {
  if (!singleton) singleton = new FilePKG()
  return singleton
}
