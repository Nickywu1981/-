/**
 * Movio AI v4.1 — 一键数据库初始化脚本
 *
 * 用法:
 *   node server/scripts/setup-db.mjs
 *   node server/scripts/setup-db.mjs --reset  (删除重建)
 *   node server/scripts/setup-db.mjs --seed-only  (仅种子数据)
 *
 * 前置条件:
 *   MySQL 已启动，根目录 .env 已配置 DB_* 变量
 */
import 'dotenv/config';
import mysql from 'mysql2/promise';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import bcrypt from 'bcryptjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const SQL_DIR = resolve(ROOT, 'server', 'sql');

// ==================== 配置 ====================
const CFG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'movio_ai',
};

// ==================== 工具函数 ====================
const log = {
  info: (msg) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
  ok: (msg) => console.log(`\x1b[32m[OK]\x1b[0m   ${msg}`),
  warn: (msg) => console.log(`\x1b[33m[WARN]\x1b[0m ${msg}`),
  err: (msg) => console.log(`\x1b[31m[ERR]\x1b[0m  ${msg}`),
};

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans); }));
}

async function getConnection(database) {
  return mysql.createConnection({
    host: CFG.host, port: CFG.port, user: CFG.user, password: CFG.password,
    database, multipleStatements: true, charset: 'utf8mb4',
  });
}

// ==================== 数据库创建 ====================
async function ensureDatabase() {
  const conn = await mysql.createConnection({
    host: CFG.host, port: CFG.port, user: CFG.user, password: CFG.password,
    charset: 'utf8mb4',
  });
  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${CFG.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await conn.end();
  log.ok(`数据库 ${CFG.database} 就绪`);
}

async function dropDatabase() {
  const conn = await mysql.createConnection({
    host: CFG.host, port: CFG.port, user: CFG.user, password: CFG.password,
    charset: 'utf8mb4',
  });
  await conn.query(`DROP DATABASE IF EXISTS \`${CFG.database}\``);
  await conn.end();
  log.warn(`数据库 ${CFG.database} 已删除`);
}

// ==================== 迁移执行 ====================
async function runMigrations(conn) {
  const migrationsDir = resolve(SQL_DIR, 'migrations');
  if (!existsSync(migrationsDir)) {
    log.warn('migrations 目录不存在，跳过');
    return;
  }

  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort(); // 按文件名时间戳排序

  log.info(`发现 ${files.length} 个迁移文件`);

  for (const file of files) {
    const sql = readFileSync(resolve(migrationsDir, file), 'utf8');
    try {
      await conn.query(sql);
      log.ok(`迁移: ${file}`);
    } catch (err) {
      log.err(`迁移失败 ${file}: ${err.message}`);
      // 继续执行后续迁移（某些表可能已存在）
    }
  }
}

// ==================== 种子数据 ====================
async function runSeeds(conn) {
  const seedFiles = readdirSync(SQL_DIR).filter(f => f.startsWith('seed_') && f.endsWith('.sql'));
  const otherSeeds = ['seed_all.sql', 'preset_data.sql', 'platform_sizes.sql']
    .filter(f => existsSync(resolve(SQL_DIR, f)));

  const allSeeds = [...seedFiles, ...otherSeeds];
  log.info(`发现 ${allSeeds.length} 个种子文件`);

  for (const file of allSeeds) {
    const sql = readFileSync(resolve(SQL_DIR, file), 'utf8');
    try {
      // 替换数据库引用
      const fixed = sql.replace(/USE\s+ai_saas\b/gi, `USE \`${CFG.database}\``);
      await conn.query(fixed);
      log.ok(`种子: ${file}`);
    } catch (err) {
      log.warn(`种子跳过 ${file}: ${err.message}`);
    }
  }
}

// ==================== 管理员账户 ====================
async function ensureAdmin(conn) {
  const SALT = bcrypt.genSaltSync(10);
  const ADMIN_PASS = process.env.ADMIN_PASSWORD || (() => {
    console.warn('[setup-db] ADMIN_PASSWORD 未设置，使用默认密码（生产环境必须通过环境变量设置！）');
    return 'admin123';
  })();
  const hash = bcrypt.hashSync(ADMIN_PASS, SALT);

  const [rows] = await conn.query('SELECT id FROM user WHERE username = ?', ['admin']);
  if (rows.length > 0) {
    await conn.query(
      'UPDATE user SET password = ?, nickname = ?, role = ?, status = 1 WHERE username = ?',
      [hash, '超级管理员', 'super_admin', 'admin']
    );
    log.ok('管理员账户已更新');
  } else {
    await conn.query(
      `INSERT INTO user (username, password, nickname, role, status, create_time)
       VALUES ('admin', ?, '超级管理员', 'super_admin', 1, NOW())`,
      [hash]
    );
    log.ok('管理员账户已创建 (admin / ******)');
  }

  // ensure admin membership
  const [mem] = await conn.query('SELECT id FROM user_membership WHERE user_id = (SELECT id FROM user WHERE username = ?)', ['admin']);
  if (mem.length === 0) {
    await conn.query(
      "INSERT INTO user_membership (user_id, plan_type, status, credit_balance, start_time) SELECT id, 3, 1, 9999, NOW() FROM user WHERE username = 'admin'"
    );
  }
}

// ==================== 验证 ====================
async function verify(conn) {
  const [[{ table_count }]] = await conn.query(
    `SELECT COUNT(*) AS table_count FROM information_schema.tables WHERE table_schema = ?`,
    [CFG.database]
  );

  const tables = await conn.query(
    `SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = ? ORDER BY TABLE_NAME`,
    [CFG.database]
  );

  log.info(`已创建 ${table_count} 张表`);

  // 统计各表行数
  const userCounts = {};
  for (const { TABLE_NAME } of tables[0]) {
    try {
      const [[{ cnt }]] = await conn.query(`SELECT COUNT(*) AS cnt FROM \`${TABLE_NAME}\``);
      if (cnt > 0) userCounts[TABLE_NAME] = cnt;
    } catch { /* skip */ }
  }

  const names = Object.keys(userCounts);
  if (names.length > 0) {
    log.info('各表数据行数:');
    for (const [k, v] of Object.entries(userCounts)) {
      console.log(`  ${k}: ${v}`);
    }
  }

  return table_count;
}

// ==================== 主流程 ====================
async function main() {
  const args = process.argv.slice(2);
  const reset = args.includes('--reset');
  const seedOnly = args.includes('--seed-only');

  console.log('\n╔═══════════════════════════════════════╗');
  console.log('║   Movio AI v4.1 — 数据库初始化工具   ║');
  console.log('╚═══════════════════════════════════════╝\n');
  log.info(`目标: ${CFG.host}:${CFG.port}/${CFG.database}`);

  try {
    // 测试连接
    const testConn = await mysql.createConnection({
      host: CFG.host, port: CFG.port, user: CFG.user, password: CFG.password,
    });
    await testConn.ping();
    await testConn.end();
    log.ok('MySQL 连接成功');
  } catch (err) {
    log.err(`无法连接 MySQL: ${err.message}`);
    log.info('请确保 MySQL 已启动，并检查 .env 中的 DB_* 配置');
    process.exit(1);
  }

  if (reset) {
    const ans = await ask('⚠️  确认删除重建数据库？(yes/no): ');
    if (ans.toLowerCase() !== 'yes') { log.info('已取消'); process.exit(0); }
    await dropDatabase();
  }

  await ensureDatabase();
  const conn = await getConnection(CFG.database);

  try {
    if (!seedOnly) {
      await runMigrations(conn);
    }
    await runSeeds(conn);
    await ensureAdmin(conn);

    const tableCount = await verify(conn);

    console.log('\n╔═══════════════════════════════════════╗');
    console.log(`║   ✅ 初始化完成!  ${tableCount} 张表已就绪  ║`);
    console.log('╚═══════════════════════════════════════╝');
    console.log('\n登录账户:');
    console.log('  后台管理员: admin / admin123');
    console.log('  体验用户:   demo  / demo123\n');
  } finally {
    await conn.end();
  }
}

main().catch(err => {
  log.err(`初始化失败: ${err.message}`);
  console.error(err);
  process.exit(1);
});
