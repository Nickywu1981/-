/**
 * DB Reset — drops all tables and re-runs migrations + seeds
 * WARNING: Destructive. Use only in development.
 * Usage: npm run db:reset
 */
import { execSync } from 'child_process';

console.log('Resetting database...');
execSync('node src/dao/migrate.js reset', { stdio: 'inherit', cwd: process.cwd() });
execSync('node scripts/run-seed.js', { stdio: 'inherit', cwd: process.cwd() });
console.log('DB reset complete.');
