/**
 * 数据库迁移工具 (Umzug v3 + MySQL2)
 *
 * 使用:
 *   npm run db:migrate          # 执行所有待处理迁移
 *   npm run db:migrate:status   # 查看待处理迁移
 *   npm run db:migrate:history  # 查看已执行迁移
 *   npm run db:migrate:down     # 回滚最近一次迁移
 *
 * 迁移文件放在 server/sql/migrations/ 目录下
 * 命名格式: YYYYMMDDHHMMSS_description.sql
 * 每个文件包含 -- UP 和 -- DOWN 两个区域
 */
import { Umzug, JSONStorage } from 'umzug';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../config/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, '../../sql/migrations');
const STORAGE_PATH = path.join(__dirname, '../../sql/.migrations.json');

function getConnection() {
  return mysql.createConnection({
    host: db.host,
    port: db.port,
    user: db.user,
    password: db.password,
    database: db.database,
    multipleStatements: true,
  });
}

/**
 * 从 SQL 文件中解析 UP / DOWN 区域
 */
function parseSqlFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const upMatch = content.match(/--\s*UP\s*\n([\s\S]*?)(?=--\s*DOWN\s*|$)/i);
  const downMatch = content.match(/--\s*DOWN\s*\n([\s\S]*)/i);
  return {
    up: upMatch ? upMatch[1].trim() : content.trim(),
    down: downMatch ? downMatch[1].trim() : '',
  };
}

export function createMigrator() {
  return new Umzug({
    migrations: {
      glob: path.join(MIGRATIONS_DIR, '*.sql'),
      resolve: ({ name, path: filePath }) => {
        const { up, down } = parseSqlFile(filePath);
        return {
          name,
          up: async ({ context }) => {
            if (up) await context.query(up);
          },
          down: async ({ context }) => {
            if (!down) {
              console.log(`  ⚠ ${name}: 无 DOWN 区域，跳过回滚`);
              return;
            }
            await context.query(down);
          },
        };
      },
    },
    context: getConnection(),
    storage: new JSONStorage({ path: STORAGE_PATH }),
    logger: {
      info: (msg) => {
        if (typeof msg === 'object' && msg.event) return; // skip verbose event logs
        console.log(`  ${msg}`);
      },
      warn: (msg) => console.warn(`  ⚠ ${typeof msg === 'object' ? JSON.stringify(msg) : msg}`),
      error: (msg) => console.error(`  ✗ ${typeof msg === 'object' ? JSON.stringify(msg) : msg}`),
      debug: () => {},
    },
  });
}

// ==================== CLI 入口 ====================

async function main() {
  const command = process.argv[2] || 'up';
  const migrator = createMigrator();

  console.log(`\n[DB Migrate] ${command.toUpperCase()}\n`);

  let conn;
  try {
    conn = await getConnection();
    await conn.ping();
    console.log('  数据库连接成功\n');
  } catch (err) {
    console.error(`  数据库连接失败: ${err.message}`);
    console.error('  请确认 MySQL 已启动，且 .env 中 DB_* 配置正确');
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  }

  try {
    switch (command) {
      case 'up': {
        const migrations = await migrator.up();
        if (migrations.length === 0) {
          console.log('  所有迁移已执行，无需更新。');
        } else {
          console.log(`\n  已执行 ${migrations.length} 个迁移:`);
          migrations.forEach((m) => console.log(`    ✓ ${m.name}`));
        }
        break;
      }
      case 'down': {
        const migrations = await migrator.down();
        if (migrations.length === 0) {
          console.log('  无迁移可回滚。');
        } else {
          console.log(`\n  已回滚 ${migrations.length} 个迁移:`);
          migrations.forEach((m) => console.log(`    ↺ ${m.name}`));
        }
        break;
      }
      case 'pending': {
        const pending = await migrator.pending();
        if (pending.length === 0) {
          console.log('  无待处理迁移。');
        } else {
          console.log(`  待处理迁移 (${pending.length}):`);
          pending.forEach((m) => console.log(`    · ${m.name}`));
        }
        break;
      }
      case 'executed': {
        const executed = await migrator.executed();
        if (executed.length === 0) {
          console.log('  无已执行迁移。');
        } else {
          console.log(`  已执行迁移 (${executed.length}):`);
          executed.forEach((m) => console.log(`    ✓ ${m.name}`));
        }
        break;
      }
      default:
        console.log(`  未知命令: ${command}`);
        console.log('  可用命令: up | down | pending | executed');
    }
  } catch (err) {
    console.error(`\n  ✗ 迁移失败: ${err.message}`);
    if (process.env.NODE_ENV === 'development') console.error(err.stack);
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }

  console.log('');
}

const calledDirectly = process.argv[1]?.includes('migrate.js');
if (calledDirectly) {
  main();
}
