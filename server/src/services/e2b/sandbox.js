/**
 * E2B 沙箱生命周期 — 创建/销毁/查询 + 预热池
 * 提取自 e2b.service.js
 */
import { Sandbox } from 'e2b';
import { BusinessError } from '../../utils/businessError.js';
import { ERROR_CODE } from '../../constants/errorCode.js';
import { e2bConfig as config } from '../../config/index.js';
import { getRedis } from '../../dao/redis.js';
import logger from '../../utils/logger.js';

// ─── 沙箱存储 ───
const SANDBOX_STORE = new Map();
export const _cleanupTimer = (() => {
  const timer = setInterval(() => {
    try {
      const now = Date.now();
      for (const [id, entry] of SANDBOX_STORE) {
        if (now - entry.createdAt > 30 * 60 * 1000) cleanupEntry(id, 'expired');
      }
      for (const sandbox of WARM_POOL) {
        if (WARM_POOL.size > _warmPoolTarget) {
          const toRemove = WARM_POOL.values().next().value;
          WARM_POOL.delete(toRemove);
          toRemove.kill().catch(err => logger.warn('[E2B] 预热池沙箱清理失败', { sandboxId: toRemove.sandboxId, error: err.message }));
        }
      }
    } catch { /* safe iteration */ }
  }, 10 * 60 * 1000);
  timer.unref();
  return timer;
})();

// ─── Redis 持久化 ───
const REDIS_E2B_SET = 'e2b:active_sandboxes';
const REDIS_E2B_PREFIX = 'e2b:sandbox:';
const REDIS_E2B_TTL = 1800;

async function _persistMeta(sandboxId, userId) {
  try {
    const r = await getRedis();
    if (!r) return;
    await r.sAdd(REDIS_E2B_SET, sandboxId);
    await r.hSet(`${REDIS_E2B_PREFIX}${sandboxId}`, { userId: String(userId), createdAt: String(Date.now()) });
    await r.expire(`${REDIS_E2B_PREFIX}${sandboxId}`, REDIS_E2B_TTL);
  } catch (err) { logger.warn('[E2B] Redis 持久化失败', { sandboxId, error: err.message }); }
}

async function _removeMeta(sandboxId) {
  try {
    const r = await getRedis();
    if (!r) return;
    await r.sRem(REDIS_E2B_SET, sandboxId);
    await r.del(`${REDIS_E2B_PREFIX}${sandboxId}`);
  } catch { /* Redis 不可用则跳过 */ }
}

// ─── 清理 ───
function cleanupEntry(sandboxId, reason = 'idle') {
  const entry = SANDBOX_STORE.get(sandboxId);
  if (!entry) return;
  SANDBOX_STORE.delete(sandboxId);
  _removeMeta(sandboxId);
  entry.sandbox.kill().catch(err => logger.warn('[E2B] 沙箱清理失败', { sandboxId, error: err.message }));
  logger.info('[E2B] 沙箱已销毁', { sandboxId, reason, age: Date.now() - entry.createdAt });
}
export { cleanupEntry };

// ─── 孤儿检测 ───
export async function startupOrphanCheck() {
  try {
    const r = await getRedis();
    if (!r) return;
    const ids = await r.sMembers(REDIS_E2B_SET);
    if (ids.length > 0) {
      logger.warn('[E2B] 检测到可能孤儿沙箱', { count: ids.length, ids });
      for (const id of ids) { await r.sRem(REDIS_E2B_SET, id); await r.del(`${REDIS_E2B_PREFIX}${id}`); }
    }
  } catch { /* Redis 不可用则跳过 */ }
}

// ─── 预热池 ───
const WARM_POOL = new Set();
let _warmPoolTarget = 0;

function _getApiKey() {
  const key = config.apiKey;
  if (!key) throw new BusinessError(ERROR_CODE.INTERNAL_ERROR);
  return key;
}

async function _fillWarmPool(count) {
  if (count <= 0) return;
  const apiKey = _getApiKey();
  for (let i = 0; i < count; i++) {
    try {
      const sandbox = await Sandbox.create({ apiKey, template: config.template, timeoutMs: config.defaultTimeoutMs, allowOutbound: config.allowOutbound ?? false });
      WARM_POOL.add(sandbox);
      logger.info('[E2B] 预热池沙箱就绪', { sandboxId: sandbox.sandboxId, poolSize: WARM_POOL.size });
    } catch (err) { logger.warn('[E2B] 预热池创建失败', { error: err.message, remaining: count - i - 1 }); break; }
  }
}

export async function initWarmPool() {
  _warmPoolTarget = config.warmPoolSize;
  if (_warmPoolTarget <= 0) return;
  logger.info('[E2B] 初始化预热池', { target: _warmPoolTarget });
  _fillWarmPool(_warmPoolTarget);
}

// ─── 核心 API ───
function _countUserSandboxes(userId) {
  const key = String(userId);
  let count = 0;
  for (const [, entry] of SANDBOX_STORE) { if (entry.userId === key) count++; }
  return count;
}

export function getSandboxEntry(sandboxId) { return SANDBOX_STORE.get(sandboxId); }

export function popWarmSandbox() {
  if (WARM_POOL.size === 0) return null;
  const sandbox = WARM_POOL.values().next().value;
  WARM_POOL.delete(sandbox);
  if (WARM_POOL.size < _warmPoolTarget) setImmediate(() => _fillWarmPool(1));
  return sandbox;
}

export async function createSandbox(userId) {
  const uid = String(userId);
  if (_countUserSandboxes(uid) >= config.maxSandboxesPerUser) {
    throw new BusinessError(ERROR_CODE.QUOTA_EXCEEDED, `Sandbox limit reached (${config.maxSandboxesPerUser})`);
  }

  let sandbox = popWarmSandbox();
  if (sandbox) {
    SANDBOX_STORE.set(sandbox.sandboxId, { sandbox, userId: uid, createdAt: Date.now() });
    _persistMeta(sandbox.sandboxId, uid);
    logger.info('[E2B] 沙箱已分配（来自预热池）', { sandboxId: sandbox.sandboxId, userId: uid, poolRemaining: WARM_POOL.size });
    return { sandboxId: sandbox.sandboxId };
  }

  const apiKey = _getApiKey();
  try {
    sandbox = await Sandbox.create({ apiKey, template: config.template, timeoutMs: config.defaultTimeoutMs, allowOutbound: config.allowOutbound ?? false });
  } catch (err) {
    logger.error('[E2B] 沙箱创建失败', { userId: uid, template: config.template, error: err.message });
    throw new BusinessError(ERROR_CODE.INTERNAL_ERROR, 'Sandbox creation error: ' + err.message);
  }
  SANDBOX_STORE.set(sandbox.sandboxId, { sandbox, userId: uid, createdAt: Date.now() });
  _persistMeta(sandbox.sandboxId, uid);
  logger.info('[E2B] 沙箱已创建', { sandboxId: sandbox.sandboxId, userId: uid });
  return { sandboxId: sandbox.sandboxId };
}

export async function getSandbox(sandboxId, userId) {
  const entry = SANDBOX_STORE.get(sandboxId);
  if (!entry) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  if (entry.userId !== String(userId)) throw new BusinessError(ERROR_CODE.FORBIDDEN);
  let running;
  try { running = await entry.sandbox.isRunning(); } catch { running = false; }
  return { sandboxId, running, createdAt: new Date(entry.createdAt).toISOString() };
}

export async function listUserSandboxes(userId) {
  const uid = String(userId);
  const list = [];
  for (const [id, entry] of SANDBOX_STORE) {
    if (entry.userId !== uid) continue;
    try { list.push({ sandboxId: id, running: await entry.sandbox.isRunning(), createdAt: new Date(entry.createdAt).toISOString() }); }
    catch { list.push({ sandboxId: id, running: false, createdAt: new Date(entry.createdAt).toISOString() }); }
  }
  return list;
}

export async function destroySandbox(sandboxId, userId) {
  const entry = SANDBOX_STORE.get(sandboxId);
  if (!entry) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  if (entry.userId !== String(userId)) throw new BusinessError(ERROR_CODE.FORBIDDEN);
  cleanupEntry(sandboxId, 'user_request');
  return { sandboxId };
}
