/**
 * Install page — /install
 * Local MCP plugin + .kap/ — no external GitHub App required for MVP.
 */

const REPO_URL = 'https://github.com/nic01asFr/KickStarteringAgentPlatform'

export default function InstallPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-20 text-center">
      <p className="mb-4 text-sm font-medium uppercase tracking-widest text-indigo-400">
        BigStarter — Build in Public
      </p>

      <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-gray-100">
        Add your project
      </h1>

      <p className="mb-10 text-lg leading-relaxed text-gray-300">
        Install the local MCP plugin, push <code className="text-indigo-300">.kap/kap.json</code>,
        and list the repo in <code className="text-indigo-300">registry.json</code>.
      </p>

      <div className="mb-10 rounded-xl border border-gray-700 bg-gray-900 p-8 text-left">
        <h2 className="mb-4 text-base font-semibold text-gray-200">How it works</h2>
        <ol className="space-y-3 text-sm text-gray-400">
          <li className="flex gap-3">
            <span className="font-bold text-indigo-400">1.</span>
            <span>
              Run <code className="text-indigo-300">npx bigstarter init</code> (or create{' '}
              <code className="text-indigo-300">.kap/kap.json</code> manually)
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-indigo-400">2.</span>
            <span>
              Commit decisions under <code className="text-indigo-300">.kap/decisions/</code> and
              updates under <code className="text-indigo-300">.kap/updates/</code>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-indigo-400">3.</span>
            <span>
              Add <code className="text-indigo-300">{'{ "owner": "…", "repo": "…" }'}</code> to{' '}
              this platform&apos;s <code className="text-indigo-300">registry.json</code>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-indigo-400">4.</span>
            <span>Platform rebuilds on push / schedule — your project page appears</span>
          </li>
        </ol>
      </div>

      <a
        href={REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-3 rounded-lg bg-indigo-600 px-8 py-4 text-base font-semibold text-white transition hover:bg-indigo-500"
      >
        View README & source
      </a>

      <p className="mt-6 text-xs text-gray-600">
        GitHub-native MVP — no hosted backend required.
      </p>
    </main>
  )
}
