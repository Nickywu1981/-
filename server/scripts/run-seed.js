/**
 * DB Seed runner — executes all seed SQL files in order
 * Usage: npm run db:seed
 *        npm run db:seed -- --dry-run  (validate only, no writes)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../dao/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlDir = path.join(__dirname, '..', 'sql');

const dryRun = process.argv.includes('--dry-run');

const seeds = [
  'seed_phase1.sql',
  'seed_phase2.sql',
  'seed_b1_fixes.sql',
  'seed_b2_prompts.sql',
  'seed_b4_logs.sql',
  'seed_b8_tenant.sql',
  'seed_c1_diy_templates.sql',
  'seed_all.sql',
];

async function run() {
  if (dryRun) {
    console.log('[DRY-RUN] Validating seed files without executing...\n');
    for (const file of seeds) {
      const filePath = path.join(sqlDir, file);
      if (!fs.existsSync(filePath)) {
        console.log(`  [MISSING] ${file}`);
      } else {
        const sql = fs.readFileSync(filePath, 'utf8');
        const count = sql.split(';').filter(s => s.trim()).length;
        console.log(`  [OK] ${file} — ${count} statements`);
      }
    }
    console.log('\nDry-run complete. No writes were made.');
    process.exit(0);
  }

  const conn = await pool.getConnection();
  try {
    for (const file of seeds) {
      const filePath = path.join(sqlDir, file);
      if (!fs.existsSync(filePath)) {
        console.log(`  [skip] ${file} — not found`);
        continue;
      }
      const sql = fs.readFileSync(filePath, 'utf8');
      const statements = sql.split(';').filter(s => s.trim());
      let skipped = 0;
      for (const stmt of statements) {
        try { await conn.query(stmt); } catch (e) {
          // ER_DUP_ENTRY (1062) or ER_DUP_KEY — safe idempotency, skip silently
          if (e.errno === 1062 || e.code === 'ER_DUP_ENTRY' || e.message?.includes('Duplicate')) {
            skipped++;
          } else {
            throw e;
          }
        }
      }
      console.log(`  [done] ${file}${skipped > 0 ? ` (${skipped} duplicates skipped)` : ''}`);
    }
    console.log('All seeds applied.');
  } finally {
    conn.release();
    process.exit(0);
  }
}

run().catch(err => { console.error(err); process.exit(1); });
