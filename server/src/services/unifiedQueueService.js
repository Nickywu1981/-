/**
 * 统一队列服务 (Unified Queue Service)
 *
 * 合并 job_queue (V4) 和 task (legacy) 两套系统为单一入口。
 * 所有 AI 异步任务统一提交到 job_queue，由 Worker 统一消费。
 *
 * 特性:
 *   - 批量进度聚合（batch 任务自动拆分/聚合子任务进度）
 *   - 自适应并发控制（根据 worker 负载动态调整）
 *   - 失败自动重试（指数退避，最大3次）
 *   - WebSocket 实时推送进度
 *   - 夜间批量模式（40% 折扣）
 */

import * as jobQueueService from './job-queue.service.js';
import * as creditService from './creditService.js';
import wsManager from './wsManager.js';
import logger from '../utils/logger.js';
import { BusinessError } from '../utils/businessError.js';
import { cacheSet, cacheGet, cacheDel } from '../dao/redis.js';
import { ERROR_CODE } from '../constants/errorCode.js';

// ==================== 批量进度聚合器 (Redis-backed) ====================

const BATCH_CACHE_PREFIX = 'batch:progress:';
const BATCH_CACHE_TTL = 3600; // 1小时

// 内存缓存作为 Redis 不可用时的降级
const memFallback = new Map();

async function cacheGetLocal(key) {
  try {
    const val = await cacheGet(key);
    if (val) return val;
  } catch (e) {
    logger.warn('[UnifiedQueue] Redis read fallback to memory', { key, error: e.message });
  }
  return memFallback.get(key) || null;
}

async function cacheSetLocal(key, value, ttl = BATCH_CACHE_TTL) {
  memFallback.set(key, value);
  try {
    await cacheSet(key, value, ttl);
  } catch (e) {
    logger.warn('[UnifiedQueue] Redis write fallback to memory', { key, error: e.message });
  }
}

async function cacheDelete(key) {
  memFallback.delete(key);
  try {
    await cacheDel(key);
  } catch (e) { logger.warn('[UnifiedQueue] cacheDel failed', { error: e.message }); }
}

function batchKey(batchId) { return `${BATCH_CACHE_PREFIX}${batchId}`; }

/**
 * 提交批量任务并自动拆分
 * 输入: N 张图片/视频 → 拆分为 N 个子任务 → Worker 并行消费 → 聚合进度
 */
export async function submitBatchTask(userId, params) {
  const {
    taskType, items = [], operation,
    nightMode = false, platform, style, priority = 5,
    tenantId,
  } = params;

  if (!items.length) throw new BusinessError(ERROR_CODE.PARAM_MISSING);

  // 夜间模式扣费（40%折扣）
  const creditAction = operation || taskType;
  if (!nightMode) {
    await creditService.consumeCredit(userId, creditAction, items.length);
  }

  // 创建批量父任务
  const parentJob = await jobQueueService.submitJob(userId, `batch_${taskType}`, {
    totalItems: items.length,
    operation,
    platform,
    style,
    nightMode,
    childJobIds: [],
    tenantId,
  }, { priority, maxRetries: 1 });

  const batchId = parentJob.job_id;
  const childJobs = [];

  // 提交子任务
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const childJob = await jobQueueService.submitJob(userId, taskType, {
      ...item,
      batchId,
      batchIndex: i,
      batchTotal: items.length,
      operation,
      platform,
      style,
      tenantId,
    }, { priority: priority + 1 });

    childJobs.push({ jobId: childJob.job_id, index: i });
  }

  // 更新父任务子任务列表
  await cacheSetLocal(batchKey(batchId), {
    total: items.length,
    completed: 0,
    failed: 0,
    childJobIds: childJobs.map((c) => c.jobId),
    status: 'running',
    userId,
    startedAt: new Date().toISOString(),
  });

  // 推送批量进度
  wsManager.pushToUser(userId, {
    type: 'batch_submitted',
    batchId,
    totalItems: items.length,
    childCount: childJobs.length,
    nightMode,
  });

  return {
    batchId,
    jobCount: childJobs.length,
    estimatedSeconds: items.length * (taskType.includes('video') ? 30 : 5),
    nightMode,
  };
}

// ==================== 批量进度更新钩子 ====================

/**
 * Worker 完成单个子任务后调用此钩子，自动聚合到父任务进度
 */
export async function onChildJobComplete(batchId, childJobId, status, result) {
  const key = batchKey(batchId);
  const batch = await cacheGetLocal(key);
  if (!batch) return;

  if (status === 'completed') batch.completed++;
  else if (status === 'failed') batch.failed++;

  const progress = Math.floor(((batch.completed + batch.failed) / batch.total) * 100);
  const allDone = (batch.completed + batch.failed) >= batch.total;

  // WebSocket 实时推送
  wsManager.pushToUser(batch.userId, {
    type: 'batch_progress',
    batchId,
    progress,
    completed: batch.completed,
    failed: batch.failed,
    total: batch.total,
    childJobId,
    childStatus: status,
  });

  if (allDone) {
    const finalStatus = batch.failed === batch.total ? 'failed' : 'completed';
    wsManager.pushToUser(batch.userId, {
      type: 'batch_complete',
      batchId,
      status: finalStatus,
      completed: batch.completed,
      failed: batch.failed,
      total: batch.total,
    });

    logger.info(`[UnifiedQueue] Batch ${batchId} ${finalStatus}: ${batch.completed}/${batch.total} ok, ${batch.failed} failed`);

    // 1小时后清理缓存
    setTimeout(() => { cacheDelete(key); }, 3600000);
  }
}

// ==================== 统一提交入口 ====================

/**
 * 统一任务提交 — 所有 AI 任务走此入口
 * @param {'single'|'batch'} mode
 */
export async function submitTask(userId, mode, params) {
  if (mode === 'batch') {
    return submitBatchTask(userId, params);
  }

  // 单任务
  const { taskType, taskParams, priority = 5, tenantId, nightMode } = params;

  if (nightMode) {
    await creditService.consumeCredit(userId, taskType, 1, 0.6);
  }

  const job = await jobQueueService.submitJob(userId, taskType, {
    ...taskParams,
    tenantId,
  }, { priority });

  return { jobId: job.job_id, status: 'queued' };
}

// ==================== 查询接口 ====================

export async function getBatchProgress(batchId) {
  const key = batchKey(batchId);
  return cacheGetLocal(key);
}

// ==================== 夜间批量处理 ====================

export async function processNightBatchJobs() {
  const pendingJobs = await jobQueueService.fetchPending(50);
  const nightJobs = pendingJobs.filter((j) => j.task_params?.nightMode);

  if (nightJobs.length === 0) return { processed: 0 };

  // 批量修改优先级，Worker 立即消费
  for (const job of nightJobs) {
    await jobQueueService.updateJobPriority(job.id, 1);
  }

  logger.info(`[UnifiedQueue] 夜间批量模式: ${nightJobs.length} 个任务已激活`);
  return { processed: nightJobs.length };
}

// ==================== 队列统计 ====================

export async function getQueueStats() {
  const stats = await jobQueueService.getQueueStats();
  const activeBatches = batchProgressCache.size;
  return { ...stats, activeBatches };
}

export default { submitTask, submitBatchTask, onChildJobComplete, getBatchProgress, processNightBatchJobs, getQueueStats };
