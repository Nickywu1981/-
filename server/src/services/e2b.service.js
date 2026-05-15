/**
 * Movio AI v4.3 — E2B Cloud Sandbox Service
 * 云端代码执行沙箱：创建/执行/销毁/配额管理
 *
 * 子模块:
 *   e2b/sandbox.js   — 沙箱生命周期 + 预热池 + Redis 持久化
 *   e2b/execution.js — 代码执行 + 安全检测 + 审计
 */
import { getRedis } from '../dao/redis.js';
import { checkAlerts } from './alertService.js';
import { getDashboardSummary } from './monitorService.js';
import {
  _cleanupTimer, startupOrphanCheck, initWarmPool,
  createSandbox, getSandbox, listUserSandboxes, destroySandbox,
} from './e2b/sandbox.js';
import { executeCode } from './e2b/execution.js';

// ─── 告警检查 (保留在父模块，60s 去抖) ───
let _lastAlertCheck = 0;
const ALERT_CHECK_INTERVAL_MS = 60_000;

function _maybeCheckAlerts() {
  const now = Date.now();
  if (now - _lastAlertCheck < ALERT_CHECK_INTERVAL_MS) return;
  _lastAlertCheck = now;
  setImmediate(() => { try { checkAlerts(getDashboardSummary()); } catch { /* 告警非关键路径 */ } });
}

// 重导出全部 API
export { _cleanupTimer, startupOrphanCheck as _startupOrphanCheck, initWarmPool as _initWarmPool };
export { createSandbox, executeCode, getSandbox, listUserSandboxes, destroySandbox };
