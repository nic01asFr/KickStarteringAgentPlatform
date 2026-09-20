#!/usr/bin/env node
/** Smoke test: FilePKG write + read without Kuzu or network */

import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { FilePKG } from '../file-pkg.js'

async function main(): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), 'kap-smoke-'))
  process.env['KAP_DATA_DIR'] = dir

  try {
    const pkg = new FilePKG(dir)

    const d = await pkg.writeDecision({
      title: 'Smoke decision',
      description: 'File PKG stores decisions as markdown.',
      rationale: 'MVP source of truth is git, not Kuzu.',
      domain: 'architecture',
      confidence: 0.95,
      alternatives_rejected: [{ option: 'Kuzu default', reason: 'Breaks platform alignment' }],
    })

    if (!existsSync(join(dir, 'decisions', d.filename))) {
      throw new Error('decision file missing')
    }

    const u = await pkg.writeUpdate({
      summary: 'Smoke update: file-pkg write path works.',
      event_type: 'milestone',
    })

    if (!existsSync(join(dir, 'updates', u.filename))) {
      throw new Error('update file missing')
    }

    const decisions = pkg.getRecentDecisions(5)
    if (decisions.length < 1) throw new Error('getRecentDecisions empty')

    const updates = pkg.getUpdates(5)
    if (updates.length < 1) throw new Error('getUpdates empty')

    const raw = readFileSync(join(dir, 'decisions', d.filename), 'utf8')
    if (!raw.includes('Smoke decision') || !raw.includes('## Rationale')) {
      throw new Error('decision content malformed')
    }

    console.log('OK file-pkg smoke')
    console.log('  decision:', d.path)
    console.log('  update:', u.path)
    console.log('  decisions_count:', decisions.length)
    console.log('  updates_count:', updates.length)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

main().catch((err) => {
  console.error('FAIL', err)
  process.exit(1)
})
