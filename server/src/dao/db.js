import mysql from 'mysql2/promise';
import { db as dbConfig, mockEnabled } from '../config/index.js';
import { tenantPool, adminPool } from './tenantPool.js';
import { getContextDB } from './context.js';
import logger from '../utils/logger.js';

let mockStore = null;
async function loadMockStore() {
  if (mockStore) return mockStore;
  try {
    mockStore = (await import('../mock/store.js')).default;
  } catch {
    mockStore = {};
  }
  return mockStore;
}

// Mock query engine: simulates basic SQL patterns against in-memory store
async function mockExecute(sql, params = []) {
  const store = await loadMockStore();
  const sqlLower = sql.toLowerCase().trim();

  // Detect table name from SQL
  const tableMatch = sqlLower.match(/(?:from|into|update)\s+`?(\w+)`?/i);
  const table = tableMatch ? tableMatch[1] : null;

  // SELECT COUNT(*)
  if (sqlLower.includes('count(*)')) {
    const rows = store[table] || [];
    // Apply simple WHERE filters
    let filtered = rows;
    if (sqlLower.includes('where') && params.length) {
      const whereClause = sqlLower.split('where')[1]?.split(/order by|group by|limit/)[0] || '';
      const fields = whereClause.match(/`?(\w+)`?\s*(?:like|>|<|=|!=)/gi) || [];
      if (fields.length > 0) {
        const field = fields[0].replace(/[`\s]/g, '').replace(/like|>|<|=|!=/gi, '');
        const val = String(params[0]).replace(/%/g, '').toLowerCase();
        filtered = rows.filter(r => String(r[field] || '').toLowerCase().includes(val));
      }
    }
    return [[{ total: filtered.length }], []];
  }

  // SELECT * or SELECT col list
  if (sqlLower.startsWith('select')) {
    let rows = (store[table] || []).map(r => ({ ...r }));

    // Parse WHERE conditions
    if (sqlLower.includes('where') && params.length) {
      const wherePart = sqlLower.split('where')[1]?.split(/order by|group by|limit/)[0] || '';
      const conditions = wherePart.split(/\s+and\s+/i);

      rows = rows.filter(r => {
        let paramIdx = 0;
        for (const cond of conditions) {
          const parts = cond.trim().split(/\s+/);
          if (parts.length < 3) continue;
          const field = parts[0].replace(/[`]/g, '');
          const op = parts[1].toLowerCase();
          const val = params[paramIdx];

          if (field === 'is_deleted') { paramIdx++; continue; }

          if (op === '=' && val !== undefined && String(r[field]) !== String(val)) return false;
          if (op === 'like' && val !== undefined) {
            const search = String(val).replace(/%/g, '').toLowerCase();
            if (!String(r[field] || '').toLowerCase().includes(search)) return false;
          }
          if (op === '>') {
            if (Number(r[field]) <= Number(val)) return false;
          }
          paramIdx++;
        }
        return true;
      });
    }

    // LIMIT
    const limitMatch = sqlLower.match(/limit\s+(\d+)(?:\s*,\s*(\d+))?/);
    if (limitMatch) {
      const offset = limitMatch[2] ? parseInt(limitMatch[1], 10) : 0;
      const count = limitMatch[2] ? parseInt(limitMatch[2], 10) : parseInt(limitMatch[1], 10);
      rows = rows.slice(offset, offset + count);
    }

    // ORDER BY
    if (sqlLower.includes('order by')) {
      const orderMatch = sqlLower.match(/order by\s+`?(\w+)`?\s*(desc|asc)?/i);
      if (orderMatch) {
        const field = orderMatch[1];
        const dir = orderMatch[2] === 'desc' ? -1 : 1;
        rows.sort((a, b) => {
          const va = a[field] || '', vb = b[field] || '';
          return va > vb ? dir : va < vb ? -dir : 0;
        });
      }
    }

    return [rows, []];
  }

  // INSERT
  if (sqlLower.startsWith('insert')) {
    const rows = store[table] || [];
    const cols = (sqlLower.match(/\(([^)]+)\)/)?.[1] || '').split(',').map(c => c.trim().replace(/[`]/g, ''));
    const newRow = {};
    cols.forEach((c, i) => { newRow[c] = params[i]; });
    newRow.id = rows.length > 0 ? Math.max(...rows.map(r => r.id || 0)) + 1 : 1;
    newRow.create_time = new Date().toISOString();
    if (!store[table]) store[table] = [];
    store[table].push(newRow);
    return [{ insertId: newRow.id, affectedRows: 1 }, []];
  }

  // UPDATE
  if (sqlLower.startsWith('update')) {
    return [{ affectedRows: 1 }, []];
  }

  // DELETE
  if (sqlLower.startsWith('delete')) {
    return [{ affectedRows: 1 }, []];
  }

  return [[], []];
}

let mockPool = null;

// eslint-disable-next-line no-unused-vars
function getMockPool() {
  if (mockPool) return mockPool;
  mockPool = {
    execute: mockExecute,
    query: mockExecute,
    getConnection: async () => ({ execute: mockExecute, query: mockExecute, release: () => {} }),
  };
  return mockPool;
}

// Real MySQL pool (lazy - won't connect until first query)
const realPool = mysql.createPool({
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  waitForConnections: true,
  connectionLimit: dbConfig.connectionLimit || 20,
  queueLimit: 0,
  acquireTimeout: 10000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  idleTimeout: 60000,
  dateStrings: true,
  connectTimeout: 3000, // fail fast if no MySQL
});

// Proxy pool: tries real DB first, falls back to mock
const realPoolProxy = new Proxy(realPool, {
  get(target, prop) {
    const original = target[prop];
    if (prop === 'getConnection') {
      return async function () {
        if (!mockEnabled) return original.apply(target);
        try {
          const conn = await original.apply(target);
          return conn;
        } catch (err) {
          if (err.code === 'ECONNREFUSED' || err.code === 'ER_BAD_DB_ERROR' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
            logger.info(`[Mock] DB getConnection unavailable (${err.code}), using mock`);
            return { execute: mockExecute, query: mockExecute, release: () => {}, commit: async () => {}, rollback: async () => {}, beginTransaction: async () => {} };
          }
          throw err;
        }
      };
    }
    if (prop !== 'execute' && prop !== 'query') return original;

    return async function (...args) {
      if (!mockEnabled) return original.apply(target, args);
      try {
        const result = await original.apply(target, args);
        return result;
      } catch (err) {
        if (err.code === 'ECONNREFUSED' || err.code === 'ER_BAD_DB_ERROR' || err.code === 'ENOTFOUND') {
          logger.info(`[Mock] DB unavailable (${err.code}), using mock data for: ${args[0]?.substring(0, 80)}`);
          return mockExecute(args[0], args[1]);
        }
        throw err;
      }
    };
  },
});

/**
 * 上下文感知连接池 — 自动检查 ALS 中的租户 DB，透明注入 tenant_id
 * 所有 DAO 通过此 pool 的 execute/query/getConnection 自动获得多租户隔离
 */
const contextAwarePool = {
  execute(sql, params = []) {
    const db = getContextDB(realPoolProxy);
    return db.execute(sql, params);
  },
  query(sql, params = []) {
    const db = getContextDB(realPoolProxy);
    return db.query(sql, params);
  },
  async getConnection() {
    if (!mockEnabled) {
      const db = getContextDB(realPool);
      return db.getConnection();
    }
    try {
      const db = getContextDB(realPool);
      const conn = await db.getConnection();
      // Test the connection is actually usable
      await conn.query('SELECT 1');
      return conn;
    } catch (err) {
      if (err.code === 'ECONNREFUSED' || err.code === 'ER_BAD_DB_ERROR' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT' || err.code === 'PROTOCOL_CONNECTION_LOST') {
        logger.info(`[Mock] DB connection unavailable (${err.code}), using mock`);
        return { execute: mockExecute, query: mockExecute, release: () => {}, commit: async () => {}, rollback: async () => {}, beginTransaction: async () => {} };
      }
      throw err;
    }
  },
};

// 保持向后兼容：支持 pool.then(), pool.on() 等 Promise/EventEmitter 方法
const pool = new Proxy(contextAwarePool, {
  get(target, prop) {
    if (prop in target) return target[prop];
    return realPool[prop]; // 代理 EventEmitter 方法 (on, once, removeListener etc.)
  },
});

export default pool;
export { realPool };

/**
 * 获取请求上下文的租户隔离数据库句柄
 * @param {import('express').Request} req - Express 请求对象
 * @returns {pool | TenantPool} 租户感知或原始连接池
 */
export function getDB(req) {
  if (req?.tenantId && req.tenantId > 0) {
    return tenantPool(req);
  }
  return pool;
}

export { tenantPool, adminPool };
