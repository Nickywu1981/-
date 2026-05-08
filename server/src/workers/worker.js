/**
 * Movio AI v4.1 — Job Queue Worker
 * G5 后端开发 | W4
 * 独立Worker进程：轮询 job_queue → 调用AI模型 → 更新结果
 * 用法: node server/src/workers/worker.js
 */
import '../utils/env.js'; // 确保环境变量已加载
import * as jobQueueService from '../services/job-queue.service.js';
import * as aiCaller from '../utils/ai-caller.js';
import * as _circuitBreaker from '../utils/circuit-breaker.js';

const POLL_INTERVAL = 2000; // 2秒轮询
const BATCH_SIZE = 3;       // 每次拉取任务数
const MAX_CONCURRENT = 5;   // 最大并发处理

let running = true;
let activeJobs = 0;

// 任务类型 → AI模型映射
const TASK_MODEL_MAP = {
  image_gen: { model: 'tongyi-wanxiang', action: 'generate' },
  image_replicate: { model: 'tongyi-wanxiang', action: 'replicate' },
  batch_image_gen: { model: 'tongyi-wanxiang', action: 'generate' },
  video_gen: { model: 'seedance', action: 'generate' },
  action_migrate: { model: 'seedance', action: 'action_migrate' },
  digital_human: { model: 'seedance', action: 'digital_human' },
  viral_analysis: { model: 'qwen', action: 'analyze' },
  viral_replicate: { model: 'seedance', action: 'generate' },
  live_clip: { model: 'seedance', action: 'clip' },
  live_cut: { model: 'seedance', action: 'cut' },
  live_noise_fix: { model: 'seedance', action: 'audio_fix' },
  live_subtitle_fix: { model: 'seedance', action: 'subtitle_fix' },
  storyboard: { model: 'qwen', action: 'storyboard' },
  product_ad: { model: 'seedance', action: 'generate' },
  replace_character: { model: 'seedance', action: 'replace' },
  multi_image_to_video: { model: 'seedance', action: 'generate' },
  batch_action_migrate: { model: 'seedance', action: 'batch_migrate' },
};

async function processJob(job) {
  activeJobs++;
  try {
    await jobQueueService.updateProgress(job.id, 10);

    const mapping = TASK_MODEL_MAP[job.task_type];
    if (!mapping) {
      await jobQueueService.failJob(job.id, `未知任务类型: ${job.task_type}`);
      return;
    }

    // 解析参数
    let params = {};
    try {
      params = typeof job.task_params === 'string' ? JSON.parse(job.task_params) : (job.task_params || {});
    } catch { params = {}; }

    await jobQueueService.updateProgress(job.id, 30);

    // 调用AI模型
    const result = await aiCaller.aiCaller.call(mapping.model, mapping.action, params);

    await jobQueueService.updateProgress(job.id, 90);

    // 完成任务
    await jobQueueService.completeJob(job.id, {
      ...result,
      task_type: job.task_type,
      completed_at: new Date().toISOString(),
    });

    console.log(`[Worker] Job #${job.id} (${job.task_type}) completed`);
  } catch (err) {
    console.error(`[Worker] Job #${job.id} failed:`, err.message);
    await jobQueueService.failJob(job.id, err.message);
  } finally {
    activeJobs--;
  }
}

async function poll() {
  while (running) {
    try {
      const available = MAX_CONCURRENT - activeJobs;
      if (available > 0) {
        const limit = Math.min(BATCH_SIZE, available);
        const jobs = await jobQueueService.fetchPending(limit);
        for (const job of jobs) {
          processJob(job); // fire-and-forget (不await，并发处理)
        }
      }
    } catch (err) {
      console.error('[Worker] Poll error:', err.message);
    }
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
  }
}

// 优雅退出
process.on('SIGTERM', () => { running = false; console.log('[Worker] SIGTERM received, shutting down...'); });
process.on('SIGINT', () => { running = false; console.log('[Worker] SIGINT received, shutting down...'); });

console.log('[Worker] Job queue worker started');
poll();
