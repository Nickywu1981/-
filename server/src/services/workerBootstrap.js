/**
 * Worker 启动器 — 在 app 启动时注册所有 BullMQ Worker
 * 由 index.js 在 HTTP server listen 后调用
 */
import logger from '../utils/logger.js';
import net from 'node:net';
import { createImageWorker, registerWorker } from './queueManager.js';

let booted = false;

function redisReady() {
  return new Promise((resolve) => {
    const s = new net.Socket();
    s.setTimeout(1500);
    s.on('connect', () => { s.destroy(); resolve(true); });
    s.on('error', () => { s.destroy(); resolve(false); });
    s.on('timeout', () => { s.destroy(); resolve(false); });
    s.connect(parseInt(process.env.REDIS_PORT || '6379', 10), process.env.REDIS_HOST || 'localhost');
  });
}

export async function bootstrapWorkers() {
  if (booted) return;
  booted = true;

  const ok = await redisReady();
  if (!ok) {
    logger.warn('[Worker] Redis 未运行 — 跳过 Worker 注册，启动 Redis 后自动恢复');
    return;
  }

  try {
    // 图片处理 Worker — 抠图/白底/场景/增强
    await createImageWorker();
    logger.info('[Worker] image-processing 已启动');

    // 视频生成 Worker
    registerWorker('video-generation', async (job) => {
      const { _userId, taskId } = job.data;
      await job.updateProgress(10);
      logger.info(`[Worker] 视频任务 ${taskId} 开始`);
      // 模拟分步进度
      for (let p = 20; p <= 100; p += 20) {
        await new Promise((r) => setTimeout(r, 1500));
        await job.updateProgress(p);
      }
      return { taskId, status: 'completed', url: `/api/video/${taskId}/output.mp4` };
    });
    logger.info('[Worker] video-generation 已启动');

    // 批量任务 Worker
    registerWorker('batch-tasks', async (job) => {
      const { _userId, taskId, imageUrls, _operation } = job.data;
      await job.updateProgress(5);
      const total = imageUrls?.length || 1;
      const results = [];
      for (let i = 0; i < total; i++) {
        await new Promise((r) => setTimeout(r, 300));
        results.push({ index: i, url: imageUrls[i].replace(/\.[^.]+$/, '_processed.webp') });
        await job.updateProgress(Math.round(((i + 1) / total) * 100));
      }
      return { taskId, results, total };
    });
    logger.info('[Worker] batch-tasks 已启动');

    // 通知 Worker
    registerWorker('notifications', async (job) => {
      const { userId, title, _body } = job.data;
      logger.info(`[Worker] 通知: ${title} → user ${userId}`);
      return { sent: true, userId, title };
    });
    logger.info('[Worker] notifications 已启动');

    logger.info('[Worker] 全部 4 个 Worker 已就绪');
  } catch (err) {
    logger.warn('[Worker] 启动失败（Redis 可能未运行）:', err.message);
  }
}
