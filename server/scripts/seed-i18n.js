/**
 * Seed: 将前端 locale 文件导入 i18n_translation 表
 * Usage: node scripts/seed-i18n.js [locale]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../src/dao/db.js';
import * as i18nDao from '../src/dao/i18nDao.js';
import logger from '../src/utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.resolve(__dirname, '../../client/locales');

function flattenJSON(obj, prefix = '') {
  const result = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result.push(...flattenJSON(value, fullKey));
    } else if (typeof value === 'string') {
      result.push({ key: fullKey, value });
    }
  }
  return result;
}

async function seed() {
  const locale = process.argv[2] || 'zh';
  const filePath = path.join(LOCALES_DIR, `${locale}.json`);

  if (!fs.existsSync(filePath)) {
    logger.error(`Locale file not found: ${filePath}`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const entries = flattenJSON(raw);

  logger.info(`[seed-i18n] ${locale}: ${entries.length} flattened keys`);

  let count = 0;
  const BATCH_SIZE = 200;
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE).map(e => ({
      namespace: e.key.includes('.') ? e.key.substring(0, e.key.indexOf('.')) : 'common',
      key: e.key,
      value: e.value,
    }));
    count += await i18nDao.upsertBatch(locale, batch);
  }

  logger.info(`[seed-i18n] ${locale}: ${count} rows upserted`);
  await pool.end();
}

seed().catch(err => {
  logger.error('[seed-i18n] Failed:', err.message);
  process.exit(1);
});
