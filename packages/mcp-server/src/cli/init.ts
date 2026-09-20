#!/usr/bin/env node
/** bigstarter init — scaffold .kap/ in the current repo */

import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'

function detectGitRemote(): { owner: string; repo: string } | null {
  try {
    const url = execSync('git remote get-url origin', { encoding: 'utf8' }).trim()
    const m =
      /github\.com[:/]([^/]+)\/([^/.]+)/.exec(url) ||
      /([^/]+)\/([^/]+)\.git$/.exec(url)
    if (m) return { owner: m[1]!, repo: m[2]! }
  } catch {
    /* no git */
  }
  return null
}

function reporterYml(): string {
  const lines = [
    'name: BigStarter Reporter',
    '',
    'on:',
    '  push:',
    '    branches: [main, master]',
    "    paths-ignore: ['.kap/updates/**']",
    '  workflow_dispatch:',
    '',
    'jobs:',
    '  report:',
    '    runs-on: ubuntu-latest',
    '    permissions:',
    '      contents: write',
    '    steps:',
    '      - uses: actions/checkout@v4',
    '      - uses: actions/setup-node@v4',
    '        with:',
    "          node-version: '22'",
    '      - name: Generate update',
    '        run: |',
    '          mkdir -p .kap/updates',
    '          DATE=$(date -u +%Y-%m-%d)',
    '          SHA="${GITHUB_SHA:0:7}"',
    '          FILE=".kap/updates/${DATE}-activity-${SHA}.md"',
    '          {',
    '            echo "---"',
    '            echo "date: \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\""',
    '            echo "event_type: \"${GITHUB_EVENT_NAME}\""',
    '            echo "---"',
    '            echo',
    '            echo "Activity on ${GITHUB_REPOSITORY} (${GITHUB_EVENT_NAME}, ${GITHUB_REF_NAME}, ${SHA})."',
    '          } > "$FILE"',
    '          echo "Written $FILE"',
    '      - name: Commit update',
    '        run: |',
    '          git config user.name "github-actions[bot]"',
    '          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"',
    '          git add .kap/updates/',
    '          git diff --cached --quiet || git commit -m "chore: add project update [skip ci]"',
    '          git push',
  ]
  return lines.join('\n') + '\n'
}

function main(): void {
  const cwd = process.cwd()
  const kapDir = join(cwd, '.kap')
  const remote = detectGitRemote()
  const dirName = cwd.split(/[/\\]/).filter(Boolean).pop() ?? 'project'

  mkdirSync(join(kapDir, 'decisions'), { recursive: true })
  mkdirSync(join(kapDir, 'updates'), { recursive: true })
  mkdirSync(join(kapDir, 'signals'), { recursive: true })

  const kapPath = join(kapDir, 'kap.json')
  if (!existsSync(kapPath)) {
    const kap = {
      name: dirName,
      pitch: '',
      owner: remote?.owner ?? '',
      repo: remote?.repo ?? dirName,
      visibility: 'private',
      tags: [] as string[],
      autonomy_level: 1,
      version: '0.1.0',
    }
    writeFileSync(kapPath, JSON.stringify(kap, null, 2) + '\n', 'utf8')
    console.log('Created ' + kapPath)
  } else {
    console.log('Exists ' + kapPath)
  }

  const wfDir = join(cwd, '.github', 'workflows')
  const wfPath = join(wfDir, 'bigstarter-reporter.yml')
  if (!existsSync(wfPath)) {
    mkdirSync(wfDir, { recursive: true })
    writeFileSync(wfPath, reporterYml(), 'utf8')
    console.log('Created ' + wfPath)
  } else {
    console.log('Exists ' + wfPath)
  }

  console.log('')
  console.log('Next: add MCP server to your agent config (stdio → bigstarter-mcp).')
  console.log('Tools write markdown under .kap/ — commit and push to share.')
}

main()
