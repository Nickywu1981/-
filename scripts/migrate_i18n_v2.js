/**
 * i18n Migration v2 — smarter template-string replacement for Vue SFC files
 * Handles: template text nodes, static placeholders, static titles
 * Skips: script blocks (manual), comments, already-i18n strings
 * Usage: node scripts/migrate_i18n_v2.js <page-path>
 */
const fs = require('fs');
const path = require('path');

const PAGE = process.argv[2];
if (!PAGE) { console.error('Usage: node scripts/migrate_i18n_v2.js <page-path>'); process.exit(1); }

const fullPath = path.resolve(PAGE);
if (!fs.existsSync(fullPath)) { console.error('File not found:', fullPath); process.exit(1); }

let content = fs.readFileSync(fullPath, 'utf8');
const pageName = path.basename(PAGE, '.vue');
const ns = 'admin_' + pageName.replace(/-/g, '_');

// Extract template section only
const tplMatch = content.match(/<template>([\s\S]*)<\/template>/);
if (!tplMatch) { console.log('No template section found'); process.exit(0); }
let template = tplMatch[1];

let newKeysZh = {};
let newKeysEn = {};
let counter = 0;
const replacements = []; // { old, new }

function makeKey(text) {
  // Simple key from first few chars
  const clean = text.replace(/[^\u4e00-\u9fff\w]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 30).toLowerCase();
  return clean || 'key_' + (++counter);
}

// 1. Replace template text nodes: >中文内容<
const textNodeRegex = />([^<]*[\u4e00-\u9fff][^<]*)</g;
let tplResult = template.replace(textNodeRegex, (match, text) => {
  const trimmed = text.trim();
  if (!trimmed || trimmed.match(/^\{\{.*\}\}$/)) return match; // skip {{ }} expressions
  if (trimmed.match(/^\$t\(/)) return match; // already i18n

  const key = makeKey(trimmed);
  // Preserve surrounding whitespace
  const leading = text.match(/^(\s*)/)[1];
  const trailing = text.match(/(\s*)$/)[1];
  const replacement = `${leading}{{ $t('${ns}.${key}') }}${trailing}`;

  if (!newKeysZh[key]) {
    newKeysZh[key] = trimmed;
    newKeysEn[key] = '[EN] ' + trimmed;
  }
  return '>' + replacement + '<';
});

// 2. Replace static placeholders
const attrRegex = /(placeholder|title)="([^"]*[\u4e00-\u9fff][^"]*)"/g;
tplResult = tplResult.replace(attrRegex, (match, attr, value) => {
  if (value.match(/\{\{/)) return match; // dynamic already
  const key = attr + '_' + makeKey(value);
  if (!newKeysZh[key]) {
    newKeysZh[key] = value;
    newKeysEn[key] = '[EN] ' + value;
  }
  return `:${attr}="$t('${ns}.${key}')"`;
});

// 3. Replace option text
const optionRegex = />([^<]*[\u4e00-\u9fff][^<]*)<\/option>/g;
tplResult = tplResult.replace(optionRegex, (match, text) => {
  const trimmed = text.trim();
  if (trimmed.match(/\{\{/) || trimmed.match(/\$t\(/)) return match;
  const key = 'option_' + makeKey(trimmed);
  if (!newKeysZh[key]) {
    newKeysZh[key] = trimmed;
    newKeysEn[key] = '[EN] ' + trimmed;
  }
  return `>{{ $t('${ns}.${key}') }}</option>`;
});

// Reconstruct file
content = content.replace(tplMatch[1], tplResult);

// Output results
console.log('=== NEW KEYS (zh.json) ===');
for (const [k, v] of Object.entries(newKeysZh)) {
  console.log(`  "${ns}": { ... "${k}": "${v}" }`);
}
console.log(`\n=== TOTAL: ${Object.keys(newKeysZh).length} new keys ===`);
console.log('\n=== English (for en.json) ===');
for (const [k, v] of Object.entries(newKeysEn)) {
  console.log(`  "${k}": "${v}"`);
}

console.log('\n=== MODIFIED FILE ===');
console.log(content);

// Write modified file
fs.writeFileSync(fullPath, content, 'utf8');
console.log('\n=== Written to', fullPath, '===');
