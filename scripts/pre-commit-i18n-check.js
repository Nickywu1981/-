#!/usr/bin/env node
/**
 * pre-commit-i18n-check.js
 *
 * 扫描 .vue 文件中的硬编码中文，确保所有用户可见文案已 i18n 化。
 *
 * 用法:
 *   node scripts/pre-commit-i18n-check.js [路径...]
 *   node scripts/pre-commit-i18n-check.js client/pages/work/
 *
 * 接入 husky / simple-git-hooks:
 *   package.json → "simple-git-hooks": {
 *     "pre-commit": "node scripts/pre-commit-i18n-check.js client/pages/"
 *   }
 *
 * 退出码: 0 = 校验通过, 1 = 发现未处理中文
 */

const fs = require('fs')
const path = require('path')

// ═══ 配置 ═══
const CONFIG = {
  scanDirs: ['client/pages/'],
  fileWhitelist: [],
  allowedContexts: {
    comment: true,
    consoleLog: true,
    regex: true,
  },
}

const args = process.argv.slice(2)
const scanDirs = args.length > 0 ? args : CONFIG.scanDirs
const projectRoot = process.cwd()

function hasChinese(str) {
  return /[\u4e00-\u9fa5]/.test(str)
}

function isInComment(trimmed) {
  return trimmed.startsWith('//') || trimmed.startsWith('<!--') ||
    trimmed.startsWith('*') || trimmed.startsWith('/*') || trimmed.startsWith('*/')
}

function isConsoleLog(line) {
  return /\bconsole\.(log|warn|error|info|debug)\s*\(/.test(line)
}

function isRegexLiteral(line) {
  return /\/\[.*\\u[0-9a-fA-F]{4}.*\][+*?{}]*\//.test(line)
}

function hasI18nCall(line) {
  return /\$t\(/.test(line) || /\bt\(/.test(line) || /useI18n\(\)/.test(line)
}

// ═══ 核心校验 ═══
function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.split('\n')
  const issues = []

  let section = 'head'
  let inHtmlComment = false
  let inJsBlockComment = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // 跟踪 HTML 多行注释 <!-- ... -->
    if (trimmed.includes('<!--')) inHtmlComment = true
    if (trimmed.includes('-->')) { inHtmlComment = false; continue }

    // 跟踪 JS 多行注释 /* ... */
    if (trimmed.startsWith('/*')) inJsBlockComment = true
    if (trimmed.includes('*/')) { inJsBlockComment = false; continue }

    // 跟踪当前区段
    if (trimmed.startsWith('<template')) { section = 'template'; continue }
    if (trimmed.startsWith('<script')) { section = 'script'; continue }
    if (trimmed.startsWith('<style')) { section = 'style'; continue }

    if (!hasChinese(line)) continue
    if (section === 'style') continue

    // 注释过滤
    if (inHtmlComment || inJsBlockComment) continue
    if (CONFIG.allowedContexts.comment && isInComment(trimmed)) continue
    if (CONFIG.allowedContexts.consoleLog && isConsoleLog(trimmed)) continue
    if (CONFIG.allowedContexts.regex && isRegexLiteral(trimmed)) continue

    // 已 i18n 化
    if (hasI18nCall(line)) continue

    const cnMatches = line.match(/[\u4e00-\u9fa5][\u4e00-\u9fa5\w]*/g) || []
    const cnText = cnMatches.slice(0, 3).join(', ')

    issues.push({
      line: i + 1,
      section,
      text: cnText,
      snippet: trimmed.substring(0, 80),
    })
  }

  return issues
}

// ═══ 扫描 ═══
function scanPath(target) {
  const fullPath = path.resolve(projectRoot, target)
  if (!fs.existsSync(fullPath)) { console.warn(`  ⚠ 路径不存在，跳过: ${target}`); return [] }

  const results = []

  if (fs.statSync(fullPath).isFile()) {
    if (!fullPath.endsWith('.vue')) return []
    const rel = path.relative(projectRoot, fullPath)
    if (CONFIG.fileWhitelist.some(w => rel.includes(w))) return []
    const issues = checkFile(fullPath)
    if (issues.length > 0) results.push({ file: rel, issues })
    return results
  }

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const ep = path.join(dir, entry.name)
      const rel = path.relative(projectRoot, ep)
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') walk(ep)
      else if (entry.isFile() && entry.name.endsWith('.vue')) {
        if (CONFIG.fileWhitelist.some(w => rel.includes(w))) continue
        const issues = checkFile(ep)
        if (issues.length > 0) results.push({ file: rel, issues })
      }
    }
  }
  walk(fullPath)
  return results
}

// ═══ Main ═══
function main() {
  console.log('\n🔍 i18n 硬编码中文校验...\n')
  console.log(`  扫描: ${scanDirs.join(', ')}\n`)

  const allResults = []
  for (const dir of scanDirs) {
    allResults.push(...scanPath(dir))
  }

  if (allResults.length === 0) {
    console.log('✅ 校验通过 — 未发现硬编码中文\n')
    process.exit(0)
  }

  console.log('❌ 发现以下文件存在未 i18n 化的中文文案:\n')
  let total = 0
  for (const { file, issues } of allResults) {
    console.log(`📄 ${file}`)
    for (const iss of issues) {
      console.log(`   L${iss.line} [${iss.section}]: "${iss.text}"`)
      console.log(`   → ${iss.snippet}`)
      total++
    }
    console.log('')
  }

  console.log(`共 ${allResults.length} 文件，${total} 处未处理中文。`)
  console.log('修复: 模板中用 $t(\'ns.key\')，script中用 useI18n().t(\'ns.key\')\n')
  process.exit(1)
}

main()
