/**
 * DB Seed runner — executes all seed SQL files in order
 * Usage: npm run db:seed
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../dao/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlDir = path.join(__dirname, '..', 'sql');

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
      for (const stmt of statements) {
        try { await conn.query(stmt); } catch (e) {
          if (!e.message?.includes('Duplicate')) throw e;
        }
      }
      console.log(`  [done] ${file}`);
    }
    console.log('All seeds applied.');
  } finally {
    conn.release();
    process.exit(0);
  }
}

run().catch(err => { console.error(err); process.exit(1); });
