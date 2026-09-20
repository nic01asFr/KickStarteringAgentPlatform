#!/usr/bin/env node
/**
 * bigstarter init — scaffold .kap/ + optional reporter workflow in the current repo.
 */

import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs'
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
    console.log(`Created ${kapPath}`)
  } else {
    console.log(`Exists ${kapPath}`)
  }

  const wfDir = join(cwd, '.github', 'workflows')
  const wfPath = join(wfDir, 'bigstarter-reporter.yml')
  if (!existsSync(wfPath)) {
    mkdirSync(wfDir, { recursive: true })
    const template = `name: BigStarter Reporter

on:
  push:
    branches: [main, master]
    paths-ignore: ['.kap/updates/**']
  workflow_dispatch:

jobs:
  report:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - name: Generate update
        run: |
          mkdir -p .kap/updates
          DATE=$(date -u +%Y-%m-%d)
          SHA=\