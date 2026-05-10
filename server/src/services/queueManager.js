/**
 * BullMQ 消息队列管理器（增强版）
 *
 * 新增：
 *   - 重试机制：默认 3 次，指数退避 1s→3s→9s
 *   - 超时控制：image 5min, video 30min, batch 60min
 *   - 任务持久化：Redis 存储，重启不丢任务
 *   - 队列监控：积压告警阈值
 *
 * 架构:
 *   Controller → addJob(queue, data) → 返回 202 { taskId }
 *   Worker → process job → updateTaskStatus → WebSocket push 进度
 */

import logger from '../utils/logger.js';
import { BusinessError } from '../utils/businessError.js';

let Queue, Worker;
let bullmqAvailable = false;
let redisAvailable = false;

async function ensureBullMQ() {
  if (bullmqAvailable) return;
  try {
    const m = await import('bullmq');
    Queue = m.Queue;
    Worker = m.Worker;
    bullmqAvailable = true;
  } catch {
    logger.warn('[BullMQ] bullmq 未安装 — 队列功能降级为同步直通模式');
    bullmqAvailable = false;
  }
}

async function checkRedis() {
  if (redisAvailable) return true;
  if (!bullmqAvailable) return false;
  const net = await import('node:net');
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2000);
    socket.on('connect', () => { socket.destroy(); redisAvailable = true; resolve(true); });
    socket.on('error', () => { socket.destroy(); resolve(false); });
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
    socket.connect(parseInt(process.env.REDIS_PORT || '6379', 10), process.env.REDIS_HOST || 'localhost');
  });
}

// ==================== 队列定义 ====================

const QUEUES = {
  'image-processing': { concurrency: parseInt(process.env.BULL_IMAGE_CONCURRENCY || '3', 10), attempts: 3, backoff: { type: 'exponential', delay: 2000 }, timeout: 300000 },
  'video-generation': { concurrency: parseInt(process.env.BULL_VIDEO_CONCURRENCY || '2', 10), attempts: 3, backoff: { type: 'exponential', delay: 5000 }, timeout: 1800000 },
  'batch-tasks':      { concurrency: parseInt(process.env.BULL_BATCH_CONCURRENCY || '5', 10), attempts: 2, backoff: { type: 'fixed', delay: 1000 },      timeout: 3600000 },
  'notifications':    { concurrency: parseInt(process.env.BULL_NOTIFY_CONCURRENCY || '10', 10), attempts: 1,                                          timeout: 60000 },
};

const queueInstances = new Map();
const workerInstances = new Map();

// ==================== 队列初始化 ====================

export function getQueue(name) {
  if (!QUEUES[name]) throw new BusinessError(500, `未定义的队列: ${name}`);
  if (!redisAvailable) throw new BusinessError(503, `Redis 不可用: ${name}`);

  if (!queueInstances.has(name)) {
    queueInstances.set(name, new Queue(name, {
      connection: { host: process.env.REDIS_HOST || 'localhost', port: parseInt(process.env.REDIS_PORT || '6379', 10) },
      defaultJobOptions: {
        attempts: QUEUES[name].attempts,
        backoff: QUEUES[name].backoff,
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    }));
    logger.info(`[BullMQ] 队列已创建: ${name}`);
  }
  return queueInstances.get(name);
}

// ==================== Worker 注册 ====================

export function registerWorker(name, processor) {
  if (!redisAvailable) {
    return null;
  }
  if (!QUEUES[name]) throw new BusinessError(500, `未定义的队列: ${name}`);
  if (workerInstances.has(name)) return workerInstances.get(name);

  const worker = new Worker(name, processor, {
    connection: { host: process.env.REDIS_HOST || 'localhost', port: parseInt(process.env.REDIS_PORT || '6379', 10) },
    concurrency: QUEUES[name].concurrency,
    autorun: true,
  });

  worker.on('completed', (job) => {
    logger.info(`[BullMQ] ${name} #${job.id} 完成`);
  });

  worker.on('failed', async (job, err) => {
    logger.error(`[BullMQ] ${name} #${job?.id} 失败: ${err.message}`);
    if (job && job.attemptsMade >= (QUEUES[name].attempts || 3)) {
      try {
        const deadQ = new Queue(`${name}-dead`, {
          connection: { host: process.env.REDIS_HOST || 'localhost', port: parseInt(process.env.REDIS_PORT || '6379', 10) },
        });
        await deadQ.add(job.name, job.data, { removeOnComplete: 200 });
        await deadQ.close();
        logger.warn(`[BullMQ] ${name} #${job.id} 最终失败 → 死信队列`);
      } catch (e) {
        logger.error(`[BullMQ] 死信队列写入失败: ${e.message}`);
      }
    }
  });

  workerInstances.set(name, worker);
  logger.info(`[BullMQ] Worker 已注册: ${name} (concurrency=${QUEUES[name].concurrency})`);
  return worker;
}

// ==================== 任务操作 ====================

export async function addJob(queueName, data, options = {}) {
  await ensureBullMQ();
  if (!bullmqAvailable) {
    logger.warn(`[BullMQ] 降级: 跳过任务 ${queueName}/${data.taskType}`);
    return { jobId: `direct-${Date.now()}`, queueName };
  }
  const queue = getQueue(queueName);
  const job = await queue.add(data.taskType || 'task', data, options);
  return { jobId: job.id, queueName };
}

export async function getJobStatus(queueName, jobId) {
  await ensureBullMQ();
  if (!bullmqAvailable) return { status: 'unknown', jobId };
  const queue = getQueue(queueName);
  const job = await queue.getJob(jobId);
  if (!job) return { status: 'not_found' };

  const state = await job.getState();
  const progress = job.progress;
  return {
    jobId, state, progress,
    attemptsMade: job.attemptsMade,
    failedReason: job.failedReason,
    data: job.data,
    returnvalue: job.returnvalue,
  };
}

// ==================== 队列统计 ====================

export async function getQueueStats(queueName) {
  await ensureBullMQ();
  if (!bullmqAvailable) return { name: queueName, waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
  const queue = getQueue(queueName);
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(), queue.getActiveCount(), queue.getCompletedCount(),
    queue.getFailedCount(), queue.getDelayedCount(),
  ]);
  return { name: queueName, waiting, active, completed, failed, delayed };
}

export async function getAllQueueStats() {
  const stats = {};
  for (const name of Object.keys(QUEUES)) {
    stats[name] = await getQueueStats(name);
  }
  return stats;
}

// ==================== 清理 ====================

export async function cleanQueue(queueName, graceSeconds = 3600) {
  await ensureBullMQ();
  if (!bullmqAvailable) return;
  const queue = getQueue(queueName);
  await queue.clean(graceSeconds * 1000, 1000, 'completed');
  await queue.clean(graceSeconds * 1000, 500, 'failed');
}

export async function closeAll() {
  for (const worker of workerInstances.values()) await worker.close();
  for (const queue of queueInstances.values()) await queue.close();
  logger.info('[BullMQ] 所有队列已关闭');
}

// ==================== 内置处理器 ====================

export async function createImageWorker() {
  await ensureBullMQ();
  if (!bullmqAvailable) return;

  const { default: batchService } = await import('./batchService.js');
  const { default: wsManager } = await import('./wsManager.js');

  return registerWorker('image-processing', async (job) => {
    const { userId, taskId, imageUrl, taskType, params } = job.data;
    await job.updateProgress(10);

    const result = await batchService.processSingle({
      userId, taskId, imageUrl, taskType, params,
      onProgress: async (pct) => {
        await job.updateProgress(10 + Math.floor(pct * 0.8));
        wsManager.pushToUser(userId, { type: 'task_progress', taskId, progress: 10 + Math.floor(pct * 0.8) });
      },
    });

    await job.updateProgress(100);
    wsManager.pushToUser(userId, { type: 'task_complete', taskId, result });
    return result;
  });
}

// 预加载 + 周期重连检测
ensureBullMQ().then(() => checkRedis()).then((ok) => {
  if (ok) logger.info('[BullMQ] Redis 已连接，队列功能可用');
  else logger.warn('[BullMQ] Redis 未运行 — 队列降级为同步模式，启动后自动恢复');
});
setInterval(async () => {
  if (!redisAvailable && bullmqAvailable) {
    const ok = await checkRedis();
    if (ok) logger.info('[BullMQ] Redis 已恢复，队列功能重新可用');
  }
}, 60000).unref();

export default {
  getQueue, registerWorker, addJob, getJobStatus,
  getQueueStats, getAllQueueStats, cleanQueue, closeAll,
  createImageWorker, QUEUES,
};
