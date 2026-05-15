/**
 * MySQL 连接池核心 — 真实连接池创建与生命周期
 *
 * 提取为独立文件以打破 db.js ↔ tenantPool.js 循环依赖
 * 导入方: db.js, tenantPool.js, adminPool()
 */
import mysql from 'mysql2/promise';
import { db as dbConfig } from '../config/index.js';
import logger from '../utils/logger.js';

const realPool = mysql.createPool({
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  waitForConnections: true,
  connectionLimit: dbConfig.connectionLimit || 20,
  queueLimit: 100,
  acquireTimeout: 10000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  idleTimeout: 60000,
  dateStrings: true,
  connectTimeout: 3000, // fail fast if no MySQL
});

// 连接验证：每次从池中取出连接时执行 SELECT 1 健康探测
realPool.on('acquire', (conn) => {
  conn.query('SELECT 1').catch((e) => { logger.warn('[DB] Health check SELECT 1 failed, connection may be dead', { error: e.message }); });
});

// Prevent unhandled pool-level errors from crashing the process
realPool.on('error', (err) => { logger.error('[DB] Pool error', { error: err.message }); });

export { realPool };
