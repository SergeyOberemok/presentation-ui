// PostToolUse hook: format files Claude edits with the project's own Prettier.
// Prettier resolves .prettierrc.json / .editorconfig from the file's location, so the hook
// never duplicates settings. --ignore-unknown skips file types Prettier can't parse.
import { spawnSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { join, relative, isAbsolute } from 'node:path'

const input = JSON.parse(readFileSync(0, 'utf8'))
const file = input.tool_input?.file_path
const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd()

if (!file || !existsSync(file)) process.exit(0)

// Only format inside the project (the vendored skills are not app code).
const rel = relative(root, file)
if (rel.startsWith('..') || isAbsolute(rel) || rel.startsWith(join('.claude', 'skills'))) {
  process.exit(0)
}

const bin = join(root, 'node_modules', 'prettier', 'bin', 'prettier.cjs')
if (!existsSync(bin)) process.exit(0)

const result = spawnSync(process.execPath, [bin, '--write', '--ignore-unknown', file], {
  cwd: root,
  encoding: 'utf8',
})
if (result.status !== 0) {
  // Exit 2 surfaces stderr to Claude, e.g. a syntax error Prettier couldn't parse.
  process.stderr.write(result.stderr || result.stdout)
  process.exit(2)
}
