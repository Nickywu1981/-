/**
 * P1: Dark mode hex color migration — batch replace hardcoded hex with CSS variables.
 * Context-aware: only replaces in background/color/border properties.
 * Usage: node scripts/migrate_hex_colors.js [--dry-run]
 */
const fs = require('fs');
const path = require('path');

const CLIENT_DIR = path.resolve(__dirname, '../client');
const DRY_RUN = process.argv.includes('--dry-run');

// Context-aware mappings: [cssProperty, hexPattern, replacement]
const MAPPINGS = [
  // ── Background colors ──
  ['background', '#fafaf9', 'var(--bg-page)'],
  ['background', '#f8f9fb', 'var(--bg-input)'],
  ['background', '#f9fafb', 'var(--bg-input)'],
  ['background', '#f5f5f4', 'var(--bg-hover)'],
  ['background', '#f5f3ff', 'var(--brand-light)'],
  ['background', '#f5f5f5', 'var(--bg-hover)'],
  ['background-color', '#fafaf9', 'var(--bg-page)'],
  ['background-color', '#f8f9fb', 'var(--bg-input)'],
  ['background-color', '#f9fafb', 'var(--bg-input)'],
  ['background-color', '#f5f5f4', 'var(--bg-hover)'],
  ['background-color', '#f5f3ff', 'var(--brand-light)'],
  ['background-color', '#f5f5f5', 'var(--bg-hover)'],

  // ── Card/header backgrounds → defined vars ──
  // Keep #ffffff as var(--bg-card) only in isolated bg contexts
  ['background', '#ffffff', 'var(--bg-card)'],
  ['background-color', '#ffffff', 'var(--bg-card)'],

  // ── Text colors ──
  ['color', '#171717', 'var(--text-primary)'],
  ['color', '#1a1a1a', 'var(--text-primary)'],
  ['color', '#6b6b70', 'var(--text-secondary)'],
  ['color', '#767676', 'var(--text-secondary)'],
  ['color', '#666666', 'var(--text-secondary)'],
  ['color', '#9d9da3', 'var(--text-muted)'],
  ['color', '#999999', 'var(--text-muted)'],

  // ── Border colors ──
  ['border-color', '#ebebea', 'var(--border-light)'],
  ['border-color', '#ddd', 'var(--border-light)'],
  ['border-color', '#e5e7eb', 'var(--border-light)'],

  // ── Brand colors (in color/background contexts) ──
  ['color', '#5b5fe3', 'var(--brand)'],
  ['background', '#5b5fe3', 'var(--brand)'],
  ['background-color', '#5b5fe3', 'var(--brand)'],
  ['color', '#1a73e8', 'var(--brand)'],
  ['background', '#1a73e8', 'var(--brand)'],
  ['background-color', '#1a73e8', 'var(--brand)'],

  // ── Status colors ──
  ['color', '#ef4444', 'var(--danger)'],
  ['color', '#dc2626', 'var(--danger)'],
  ['color', '#f59e0b', 'var(--warning)'],
  ['color', '#10b981', 'var(--success)'],
  ['color', '#3b82f6', 'var(--info)'],
  ['background', '#dcfce7', 'var(--success-light)'],
  ['background', '#fef2f2', 'var(--danger-light)'],
  ['background', '#fffbeb', 'var(--warning-light)'],
  ['background', '#eff6ff', 'var(--info-bg)'],
  ['background', '#fef3c7', 'var(--warning-border)'],

  // ── Common border shorthand patterns ──
  ['border', '#ebebea', 'var(--border-light)'],
  ['border', '#ddd', 'var(--border-light)'],
  ['border', '#e5e7eb', 'var(--border-light)'],
  ['border', '#eee', 'var(--border-light)'],
  ['border-bottom', '#ebebea', 'var(--border-light)'],
  ['border-bottom', '#ddd', 'var(--border-light)'],
  ['border-bottom', '#eee', 'var(--border-light)'],
  ['border-top', '#ebebea', 'var(--border-light)'],
  ['border-top', '#ddd', 'var(--border-light)'],

  // ── SVG colors ──
  ['fill', '#6b6b70', 'var(--text-secondary)'],
  ['fill', '#767676', 'var(--text-secondary)'],
  ['fill', '#9d9da3', 'var(--text-muted)'],
  ['stroke', '#6b6b70', 'var(--text-secondary)'],
  ['stroke', '#ebebea', 'var(--border-light)'],
  ['stroke', '#ddd', 'var(--border-light)'],

  // ── Additional background colors ──
  ['background', '#e2e8f0', 'var(--bg-hover)'],
  ['background', '#f0f0f0', 'var(--bg-hover)'],
  ['background', '#fee2e2', 'var(--danger-light)'],
  ['background', '#dbeafe', 'var(--info-bg)'],
  ['background', '#d1fae5', 'var(--success-light)'],
  ['background', '#e8f5e9', 'var(--success-light)'],

  // ── Color with #666 (not caught in first pass) ──
  ['color', '#666', 'var(--text-secondary)'],
  ['color', '#ddd', 'var(--text-muted)'],
  ['color', '#e5e7eb', 'var(--text-muted)'],

  // ── Additional text colors ──
  ['color', '#2a2a2a', 'var(--text-primary)'],
  ['color', '#333333', 'var(--text-primary)'],
  ['color', '#333', 'var(--text-primary)'],
  ['color', '#212121', 'var(--text-primary)'],

  // ── Status badge colors (backgrounds with dark text) ──
  ['background', '#fce4ec', 'var(--danger-light)'],
  ['background', '#fff3cd', 'var(--warning-light)'],
  ['background', '#dcfce7', 'var(--success-light)'],
];

// Patterns to skip (keep hex in these contexts)
const SKIP_PATTERNS = [
  /var\(--/,    // Already uses CSS variable
  /gradient/,   // In gradient definitions
  /rgba\(/,     // In rgba()
  /url\(/,      // In URLs
  /#(?:fff|FFF|000|000000|ffffff|FFFFFF)\b/,  // Pure white/black intentionally kept
];

let totalReplacements = 0;
const modifiedFiles = [];

function shouldSkip(cssLine) {
  return SKIP_PATTERNS.some(p => p.test(cssLine));
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Extract <style> blocks from Vue files
  let hasStyleBlock = false;
  if (filePath.endsWith('.vue')) {
    const styleMatches = content.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi);
    for (const sm of styleMatches) {
      hasStyleBlock = true;
      const original = sm[1];
      let styleContent = original;

      for (const [prop, hex, replacement] of MAPPINGS) {
        const pattern = new RegExp(
          `(${prop}\\s*:\\s*)${escapeRegex(hex)}(\\s*[;!}])`,
          'gi'
        );
        styleContent = styleContent.replace(pattern, (match, prefix, suffix) => {
          // Skip if line contains skip-patterns
          const line = match;
          if (shouldSkip(line)) return match;
          changed = true;
          totalReplacements++;
          return `${prefix}${replacement}${suffix}`;
        });

        // Also handle hex as part of shorthand like "border: 1px solid #hex"
        const shorthandPattern = new RegExp(
          `(${prop}\\s*:\\s*[^;{]*?\\s)${escapeRegex(hex)}(\\s*[;!}])`,
          'gi'
        );
        styleContent = styleContent.replace(shorthandPattern, (match, prefix, suffix) => {
          if (shouldSkip(match)) return match;
          // Avoid double-replacement from above
          if (match.includes(replacement)) return match;
          changed = true;
          totalReplacements++;
          return `${prefix}${replacement}${suffix}`;
        });
      }

      if (changed) {
        content = content.replace(original, styleContent);
      }
    }
  }

  // For .css files
  if (filePath.endsWith('.css')) {
    let styleContent = content;
    for (const [prop, hex, replacement] of MAPPINGS) {
      const pattern = new RegExp(
        `(${prop}\\s*:\\s*)${escapeRegex(hex)}(\\s*[;!}])`,
        'gi'
      );
      styleContent = styleContent.replace(pattern, (match, prefix, suffix) => {
        if (shouldSkip(match)) return match;
        changed = true;
        totalReplacements++;
        return `${prefix}${replacement}${suffix}`;
      });
    }
    if (changed) content = styleContent;
  }

  if (changed) {
    if (!DRY_RUN) fs.writeFileSync(filePath, content, 'utf8');
    modifiedFiles.push(filePath);
    console.log(`  ${DRY_RUN ? '[DRY] ' : ''}✓ ${path.relative(CLIENT_DIR, filePath)}`);
  }
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Process all Vue files under client (excluding node_modules)
function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.name === 'node_modules' || entry.name === '.nuxt') continue;
    if (entry.isDirectory()) {
      walkDir(full);
    } else if (entry.name.endsWith('.vue') || entry.name.endsWith('.css')) {
      // Skip token/theme files (already using CSS variables)
      if (full.includes('design-tokens') || full.match(/(\/|\\)theme\.css$/) || full.includes('unified-design')) continue;
      processFile(full);
    }
  }
}

console.log(`P1 Hex Color Migration ${DRY_RUN ? '(DRY RUN)' : '(WRITE MODE)'}\n`);
console.log('Scanning client/ for hardcoded hex colors...\n');
walkDir(CLIENT_DIR);

console.log(`\nDone: ${modifiedFiles.length} files modified, ${totalReplacements} total replacements`);
if (DRY_RUN) console.log('(DRY RUN — no files were written. Remove --dry-run to apply.)');
