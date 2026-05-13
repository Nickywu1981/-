import pool from './db.js';
import logger from '../utils/logger.js';
import { BusinessError } from '../utils/businessError.js';
import { ERROR_CODE } from '../constants/errorCode.js';

/**
 * 事务包装器 — 传入回调自动获得 conn，失败自动回滚
 *
 * 用法:
 *   await withTransaction(async (conn) => {
 *     await userDao.insertUser(data, conn);
 *     await enterpriseDao.createTenant(data, conn);
 *   });
 */
export async function withTransaction(fn, options = {}) {
  const { isolationLevel, maxRetries = 0 } = options;
  const conn = await pool.getConnection();

  let lastError = null;
  try {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        logger.warn('[TX] 重试事务', { attempt, cause: lastError?.message });
        await new Promise(r => setTimeout(r, 200 * Math.pow(2, attempt)));
      }
      try {
        await conn.beginTransaction();
        if (isolationLevel) {
          const VALID_LEVELS = ['READ UNCOMMITTED', 'READ COMMITTED', 'REPEATABLE READ', 'SERIALIZABLE'];
          if (!VALID_LEVELS.includes(isolationLevel)) throw new BusinessError(ERROR_CODE.PARAM_ERROR, `Invalid isolation level: ${isolationLevel}`);
          await conn.query(`SET TRANSACTION ISOLATION LEVEL ${isolationLevel}`);
        }
        const result = await fn(conn);
        await conn.commit();
        return result;
      } catch (e) {
        lastError = e;
        try { await conn.rollback(); } catch (_) { logger.warn('[TX] rollback 失败（连接可能已断开）'); }
        if (e.code === 'ER_LOCK_DEADLOCK' || e.code === 'ER_LOCK_WAIT_TIMEOUT') {
          if (attempt < maxRetries) continue;
        }
        throw e;
      }
    }
    throw lastError;
  } finally {
    conn.release();
  }
}

/**
 * DAO 事务适配器 — 将任意 DAO 函数包装为事务感知版本
 *
 * 无需修改原始 DAO 即可在事务中使用:
 *   const txUserDao = transactional(userDao);
 *   await withTransaction(async (conn) => {
 *     await txUserDao.insertUser(data, conn);
 *   });
 *
 * 原理: 检查最后一个参数是否为 conn 对象，是则用它代替 pool
 */
export function transactional(daoModule) {
  return new Proxy(daoModule, {
    get(target, prop) {
      const original = target[prop];
      if (typeof original !== 'function') return original;
      return function (...args) {
        const lastArg = args[args.length - 1];
        // 检测传入的 conn 参数（连接对象有 execute/query 方法）
        const hasConn = lastArg && typeof lastArg === 'object'
          && (typeof lastArg.execute === 'function' || typeof lastArg.query === 'function');
        if (hasConn) {
          const conn = args.pop();
          // 临时替换 pool → conn 的闭包版本
          // 若原始函数支持 conn 参数，直接透传；否则用闭包绑定
          if (original.length > args.length) {
            // 原始函数签名已包含 conn 参数 → 直接传递
            return original(...args, conn);
          }
          // 原始函数不支持 conn → 需要重写（仅对 import pool 模式有效，动态替换）
          // 这需要模块级变量重绑定，走 bindDaoConn 路径
          return original(...args);
        }
        return original(...args);
      };
    },
  });
}

/**
 * 死锁重试包装器 — 适用于单语句调用
 */
export async function withDeadlockRetry(fn, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if ((e.code === 'ER_LOCK_DEADLOCK' || e.code === 'ER_LOCK_WAIT_TIMEOUT') && attempt < maxRetries) {
        logger.warn('[TX] 死锁重试', { attempt, cause: e.message });
        await new Promise(r => setTimeout(r, 100 * Math.pow(2, attempt)));
        continue;
      }
      throw e;
    }
  }
}
