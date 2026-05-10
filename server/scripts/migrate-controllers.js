/**
 * 批量迁移: try/catch → wrapController
 * 运行: node scripts/migrate-controllers.js
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const CTRL_DIR = join(import.meta.dirname, '../src/controller');
const SKIP = new Set([
  'diyController.js', 'templateMarketController.js',
  'digitalHumanController.js', 'distributionController.js',
  'platformPublishController.js', 'videoTranslateController.js',
]);

function transform(src) {
  let changed = false;

  // Step 1: Convert function declarations to wrapController form
  // Matches: export async function NAME(req, res) { try {     OR
  //          export async function NAME(_req, res, next) { try {
  src = src.replace(
    /export async function (\w+)\((_?req,\s*res(?:,\s*next)?)\)\s*\{\s*(?:\/\/[^\n]*\n\s*)?try\s*\{/g,
    (_, name, params) => {
      changed = true;
      return `export const ${name} = wrapController(async (${params}) => {`;
    }
  );

  if (!changed) return null;

  // Step 2: Remove catch blocks — ONLY those using error() pattern
  // The next(err) pattern stays as-is (those functions won't be wrapped)
  src = src.replace(
    /\n[\s]*\}[\s\n]*catch\s*\(\w+\)\s*\{[\s\n]*return\s+error\s*\(res,\s*\w+(?:\.status\s*\|\|\s*ERROR_CODE\.\w+)?\s*,\s*\w+\.message\)[;\s\n]*\}/g,
    ''
  );
  src = src.replace(
    /\n[\s]*\}[\s\n]*catch\s*\(\w+\)\s*\{[\s\n]*error\s*\(res,\s*\w+(?:\.status\s*\|\|\s*ERROR_CODE\.\w+)?\s*,\s*\w+\.message\)[;\s\n]*\}/g,
    ''
  );

  // Step 3: Add import if not present
  if (!src.includes("import { wrapController }")) {
    const firstImport = src.match(/^import /m);
    if (firstImport) {
      const pos = firstImport.index;
      src = src.slice(0, pos) +
        "import { wrapController } from '../utils/wrapController.js';\n" +
        src.slice(pos);
    }
  }

  return src;
}

const files = readdirSync(CTRL_DIR).filter(f => f.endsWith('.js') && !SKIP.has(f));
let changed = 0;

for (const file of files) {
  const path = join(CTRL_DIR, file);
  const src = readFileSync(path, 'utf-8');
  const result = transform(src);
  if (result) {
    writeFileSync(path, result, 'utf-8');
    changed++;
    console.log(`✓ ${file}`);
  }
}

console.log(`\n${changed} controllers migrated.`);
