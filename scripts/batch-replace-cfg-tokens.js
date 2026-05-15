const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// All files with --cfg- references
const result = execSync('grep -rl --include="*.vue" --include="*.css" "\\-\\-cfg-" "I:/智能体助手项目/client"', { encoding: 'utf8' })
const files = result.trim().split('\n').filter(Boolean)

console.log(`Found ${files.length} files with --cfg- tokens\n`)

const replacements = [
  // Spacing
  [/var\(--cfg-spacing-xl\b/g,  'var(--space-8, 32px)'],
  [/var\(--cfg-spacing-lg\b/g,  'var(--space-6, 24px)'],
  [/var\(--cfg-spacing-base\b/g, 'var(--space-4, 16px)'],
  [/var\(--cfg-spacing-md\b/g,  'var(--space-3, 12px)'],
  [/var\(--cfg-spacing-sm\b/g,  'var(--space-2, 8px)'],
  [/var\(--cfg-spacing-xs\b/g,  'var(--space-1, 4px)'],
  // Font sizes
  [/var\(--cfg-font-size-2xl\b/g, 'var(--text-2xl, 1.5rem)'],
  [/var\(--cfg-font-size-xl\b/g,  'var(--text-xl, 1.25rem)'],
  [/var\(--cfg-font-size-lg\b/g,  'var(--text-lg, 1.125rem)'],
  [/var\(--cfg-font-size-base\b/g,'var(--text-base, 1rem)'],
  [/var\(--cfg-font-size-sm\b/g,  'var(--text-sm, 0.875rem)'],
  [/var\(--cfg-font-size-xs\b/g,  'var(--text-xs, 0.75rem)'],
  // Text colors
  [/var\(--cfg-text-primary\b/g,   'var(--text-primary, #1f2937)'],
  [/var\(--cfg-text-secondary\b/g, 'var(--text-secondary, #6b7280)'],
  [/var\(--cfg-text-muted\b/g,     'var(--text-muted, #9ca3af)'],
  [/var\(--cfg-text-on-primary\b/g,'var(--text-on-primary, #fff)'],
  // Border / BG
  [/var\(--cfg-border\b/g,       'var(--border-color, #e5e7eb)'],
  [/var\(--cfg-bg-primary\b/g,   'var(--bg-card, #ffffff)'],
  [/var\(--cfg-bg-secondary\b/g, 'var(--bg-secondary, #f9fafb)'],
  [/var\(--cfg-bg-tertiary\b/g,  'var(--bg-tertiary, #f3f4f6)'],
  // Brand / primary
  [/var\(--cfg-primary\b/g, 'var(--brand, #5b5fe3)'],
  // Radius
  [/var\(--cfg-radius-base\b/g, 'var(--radius-md, 8px)'],
  [/var\(--cfg-radius-lg\b/g,   'var(--radius-lg, 12px)'],
  [/var\(--cfg-radius-sm\b/g,   'var(--radius-sm, 4px)'],
  [/var\(--cfg-radius-full\b/g, 'var(--radius-full, 9999px)'],
  // Font weight
  [/var\(--cfg-font-weight-semibold\b/g, '600'],
  [/var\(--cfg-font-weight-medium\b/g,   '500'],
  [/var\(--cfg-font-weight-bold\b/g,     '700'],
  [/var\(--cfg-font-weight-normal\b/g,   '400'],
  // Misc
  [/var\(--cfg-z-toast\b/g, 'var(--z-toast, 6000)'],
  [/var\(--cfg-success\b/g, 'var(--success, #10b981)'],
  [/var\(--cfg-error\b/g,   'var(--danger, #ef4444)'],
  [/var\(--cfg-radius\b/g,  'var(--radius-md, 8px)'],
  // Locally-defined custom properties (rename only if locally defined)
  [/--cfg-warn-bg\b/g, '--warn-bg'],
  [/--cfg-warn-border\b/g, '--warn-border'],
  [/--cfg-text-on-primary\b/g, '--text-on-primary'],
]

let totalCount = 0
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8')
  let fileCount = 0
  for (const [regex, replacement] of replacements) {
    const matches = content.match(regex)
    if (matches) {
      fileCount += matches.length
      content = content.replace(regex, replacement)
    }
  }
  if (fileCount > 0) {
    fs.writeFileSync(file, content, 'utf8')
    console.log(`  ${path.basename(file)}: ${fileCount} replacements`)
    totalCount += fileCount
  }
}

console.log(`\nTotal: ${totalCount} replacements across ${files.length} files`)
