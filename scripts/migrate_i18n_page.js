/**
 * Semi-automated i18n migration for a single Vue page.
 * Extracts Chinese strings, generates keys, replaces in template, adds to zh/en.json.
 * Usage: node scripts/migrate_i18n_page.js <namespace> <page_path> [--dry-run]
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const filtered = args.filter(a => a !== '--dry-run');
const namespace = filtered[0];
const vuePath = filtered[1];

if (!namespace || !vuePath) {
  console.error('Usage: node migrate_i18n_page.js <namespace> <vue_path> [--dry-run]');
  process.exit(1);
}

const ROOT = path.resolve(__dirname, '..');
const zhPath = path.join(ROOT, 'client/i18n/locales/zh.json');
const enPath = path.join(ROOT, 'client/i18n/locales/en.json');
const vueFilePath = path.resolve(vuePath);

if (!fs.existsSync(vueFilePath)) {
  console.error('File not found:', vueFilePath);
  process.exit(1);
}

let content = fs.readFileSync(vueFilePath, 'utf8');

// Extract template section only
const tplMatch = content.match(/<template>([\s\S]*)<\/template>/);
if (!tplMatch) {
  console.error('No <template> section found');
  process.exit(1);
}
const templateContent = tplMatch[1];

// Extract unique Chinese strings from >...< text nodes (template only)
const chineseRegex = />([^<]*[\u4e00-\u9fff][^<]*)</g;
const uniqueChinese = new Set();
let match;
while ((match = chineseRegex.exec(templateContent)) !== null) {
  const text = match[1].trim();
  if (text && text.length > 1 && !text.includes('{{') && !text.includes('$t(')) {
    uniqueChinese.add(text);
  }
}

// Also catch placeholder= and title= attributes (template only)
const attrRegex = /(?:placeholder|title)="([^"]*[\u4e00-\u9fff][^"]*)"/g;
while ((match = attrRegex.exec(templateContent)) !== null) {
  if (match[1] && !match[1].includes('{{')) uniqueChinese.add(match[1].trim());
}

function toKey(str) {
  return str
    .replace(/[^\w\u4e00-\u9fff]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase()
    .slice(0, 40);
}

function hashCode(s) { let h = 0; for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; } return Math.abs(h); }

const keys = {};
const sorted = [...uniqueChinese].sort((a, b) => b.length - a.length);
sorted.forEach((s) => {
  let key = toKey(s);
  if (!key) key = 'k_' + hashCode(s).toString(36);
  let finalKey = key;
  let i = 1;
  while (Object.values(keys).includes(finalKey)) {
    finalKey = key + '_' + (i++);
  }
  keys[s] = finalKey;
});

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Replace in template content only
let migratedTemplate = templateContent;

for (const [chinese, key] of Object.entries(keys).sort((a, b) => b[0].length - a[0].length)) {
  const esc = escapeRegExp(chinese);
  const i18n = `$t('${namespace}.${key}')`;

  // Text nodes: >text<
  migratedTemplate = migratedTemplate.replace(new RegExp('>' + esc + '<', 'g'), '>{{ ' + i18n + ' }}<');
  // placeholder="text"
  migratedTemplate = migratedTemplate.replace(new RegExp('placeholder="' + esc + '"', 'g'), ':placeholder="' + i18n + '"');
  // title="text"
  migratedTemplate = migratedTemplate.replace(new RegExp('title="' + esc + '"', 'g'), ':title="' + i18n + '"');
}

// Reconstruct file
content = content.replace(templateContent, migratedTemplate);

if (!dryRun) {
  fs.writeFileSync(vueFilePath, content, 'utf8');

  // Add i18n keys to zh.json and en.json
  const zh = JSON.parse(fs.readFileSync(zhPath, 'utf8'));
  const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

  if (!zh[namespace]) zh[namespace] = {};
  if (!en[namespace]) en[namespace] = {};

  for (const [chinese, key] of Object.entries(keys)) {
    zh[namespace][key] = chinese;
    en[namespace][key] = '[EN] ' + chinese;
  }

  fs.writeFileSync(zhPath, JSON.stringify(zh, null, 2) + '\n', 'utf8');
  fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n', 'utf8');
}

console.log(`Namespace: ${namespace}`);
console.log(`File: ${path.relative(ROOT, vueFilePath)}`);
console.log(`Strings extracted: ${Object.keys(keys).length}`);
console.log(`Mode: ${dryRun ? 'DRY RUN' : 'WRITTEN'}`);
console.log('\nKeys:');
for (const [chinese, key] of Object.entries(keys)) {
  console.log(`  ${key}: ${chinese}`);
}
