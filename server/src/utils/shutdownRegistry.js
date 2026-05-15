/**
 * 关闭清理注册中心 — 管理 setInterval / setTimeout / 资源清理函数
 *
 * 所有模块级定时器均应通过此注册中心创建，以保证在 gracefulShutdown 时被自动清理。
 *
 * 用法:
 *   import { registerInterval, registerCleanup } from '../utils/shutdownRegistry.js';
 *   const timer = registerInterval(() => cleanupStaleData(), 30 * 60 * 1000);
 *   registerCleanup(async () => { await closeConnection(); });
 */

import logger from './logger.js';

const timers = new Set();
const cleanupFns = [];

let shutdownCalled = false;

/** 注册已有定时器（由外部 setInterval/setTimeout 创建）用于自动清理 */
export function registerTimer(id) {
  if (shutdownCalled || !id) return;
  timers.add(id);
}

/** 注册可自动清理的 setInterval */
export function registerInterval(fn, ms) {
  if (shutdownCalled) return null;
  const id = setInterval(() => {
    try { fn(); } catch (e) { logger.warn('[ShutdownRegistry] 定时器回调异常', { message: e.message }); }
  }, ms);
  id.unref?.();
  timers.add(id);
  return id;
}

/** 注册可自动清理的 setTimeout */
export function registerTimeout(fn, ms) {
  if (shutdownCalled) return null;
  const id = setTimeout(() => {
    try { fn(); } catch (e) { logger.warn('[ShutdownRegistry] 定时器回调异常', { message: e.message }); }
    timers.delete(id);
  }, ms);
  timers.add(id);
  return id;
}

/** 注册关闭清理函数（在 gracefulShutdown 时按注册顺序倒序执行） */
export function registerCleanup(fn) {
  if (shutdownCalled) return;
  cleanupFns.push(fn);
}

/** 执行所有注册的清理：先清定时器，再按 LIFO 顺序执行清理函数 */
export async function runShutdown() {
  if (shutdownCalled) return;
  shutdownCalled = true;

  // 1. 清除所有定时器
  const timerCount = timers.size;
  for (const id of timers) {
    try { clearInterval(id); } catch (_) { /* noop */ }
    try { clearTimeout(id); } catch (_) { /* noop */ }
  }
  timers.clear();
  logger.info(`[Shutdown] 已清理 ${timerCount} 个定时器`);

  // 2. 按 LIFO 顺序执行清理函数（后注册先清理，类似析构顺序）
  const fnCount = cleanupFns.length;
  for (let i = cleanupFns.length - 1; i >= 0; i--) {
    try {
      const result = cleanupFns[i]();
      if (result && typeof result.then === 'function') await result;
    } catch (e) {
      logger.warn('[Shutdown] 清理函数执行失败', { message: e.message });
    }
  }
  cleanupFns.length = 0;
  logger.info(`[Shutdown] 已执行 ${fnCount} 个清理函数`);
}

/** 确认是否已触发关闭 */
export function isShuttingDown() {
  return shutdownCalled;
}
