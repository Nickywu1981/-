import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, extname, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const EXCLUDE_DIRS = ['node_modules', 'dist', '.nuxt', '.output', 'coverage', 'e2e', 'locales', 'data', 'scripts']
const EXCLUDE_FILES = ['usePageSEO.ts', 'posterData.ts', 'useDiyComponents.ts', 'useSiteConfig.ts',
  'terms.vue', 'privacy.vue', 'JsonLd.vue', 'simple-batch.ts', 'useAppDict.ts', 'useApi.ts',
  'ComingSoonPlaceholder.vue']

const CHINESE_RE = /[\u4e00-\u9fff]+/

function walk(dir) {
  const files = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (EXCLUDE_DIRS.some(d => full.replace(/\\/g, '/').includes(`/${d}/`) || full.endsWith(`/${d}`))) continue
    try {
      if (statSync(full).isDirectory()) { files.push(...walk(full)) }
      else if (['.vue', '.ts', '.tsx'].includes(extname(entry))) { files.push(full) }
    } catch { /* skip */ }
  }
  return files
}

function cleanLine(line) {
  // Remove HTML comments (single-line)
  let s = line.replace(/<!--[\s\S]*?-->/g, '')
  // Remove inline // comments
  s = s.replace(/\/\/.*$/, '')
  // Remove $t(...) and t(...) calls
  s = s.replace(/\$t\([^)]*\)/g, '')
  s = s.replace(/(?<![\w$])\bt\([^)]*\)/g, '')
  return s
}

function isInHtmlComment(lines, lineIdx) {
  // Check if this line is inside an HTML comment block
  let inComment = false
  for (let i = 0; i <= lineIdx; i++) {
    const l = lines[i]
    if (!inComment && l.includes('<!--')) {
      inComment = true
      if (l.includes('-->') && l.indexOf('-->') > l.indexOf('<!--')) {
        inComment = false // single-line comment
      }
    } else if (inComment && l.includes('-->')) {
      inComment = false
    }
    if (i === lineIdx) return inComment
  }
  return false
}

function isInJsBlockComment(lines, lineIdx) {
  let inComment = false
  for (let i = 0; i <= lineIdx; i++) {
    const l = lines[i]
    if (!inComment && l.includes('/*')) {
      inComment = true
      if (l.includes('*/') && l.indexOf('*/') > l.indexOf('/*')) {
        inComment = false
      }
    } else if (inComment && l.includes('*/')) {
      inComment = false
    }
    if (i === lineIdx) return inComment
  }
  return false
}

let violations = 0
const resultLines = []

for (const file of walk(ROOT)) {
  if (EXCLUDE_FILES.some(f => file.endsWith(f))) continue

  const raw = readFileSync(file, 'utf-8')
  const lines = raw.split('\n')
  // Replace HTML comment lines with empty strings (preserving line numbers)
  const linesNoComment = lines.map((l, i) => {
    if (isInHtmlComment(lines, i) || isInJsBlockComment(lines, i)) return ''
    return l
  })

  for (let i = 0; i < linesNoComment.length; i++) {
    const trimmed = linesNoComment[i].trim()
    if (!trimmed) continue
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue

    const cleaned = cleanLine(trimmed)
    if (!CHINESE_RE.test(cleaned)) continue

    // Also skip console messages (not user-facing)
    if (trimmed.includes('console.warn') || trimmed.includes('console.error') || trimmed.includes('console.log')) continue

    const snippet = lines[i].trim().slice(0, 140)
    resultLines.push(`${file}:${i + 1}: ${snippet}`)
    violations++
  }
}

if (violations > 0) {
  for (const l of resultLines) console.log(l)
  console.log(`\n\x1b[31m❌ ${violations} hardcoded Chinese string(s) found.\x1b[0m`)
  process.exit(1)
} else {
  console.log('\x1b[32m✅ No hardcoded Chinese user-facing strings found.\x1b[0m')
}
