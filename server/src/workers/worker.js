/**
 * Movio AI v4.1 — Job Queue Worker
 * G5 后端开发 | W4
 * 独立Worker进程：轮询 job_queue → 调用AI模型 → 更新结果
 * 用法: node server/src/workers/worker.js
 */
// dotenv 由 config/index.js 负责加载
import logger from '../utils/logger.js';
import config from '../config/index.js';
import { validateStartupConfig } from '../utils/startupGuard.js';
import * as jobQueueService from '../services/job-queue.service.js';
import * as aiCaller from '../utils/ai-caller.js';
import * as _circuitBreaker from '../utils/circuit-breaker.js';

// 启动配置校验
validateStartupConfig();

const POLL_INTERVAL = parseInt(process.env.WORKER_POLL_INTERVAL, 10) || 2000;
const BATCH_SIZE = parseInt(process.env.WORKER_BATCH_SIZE, 10) || 3;
const MAX_CONCURRENT = parseInt(process.env.WORKER_MAX_CONCURRENT, 10) || 5;

let running = true;
const activeJobIds = new Set();


// 任务类型 → AI模型映射
// { model, action, endpoint?, apiKey? } — endpoint/apiKey 优先于默认 NewAPI 路由
const TASK_MODEL_MAP = {
  image_gen: { model: 'gpt-image-2', action: 'generate' },
  image_replicate: { model: 'gpt-image-2', action: 'replicate' },
  batch_image_gen: { model: 'gpt-image-2', action: 'generate' },
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

// 模型 → 端点映射 (NewAPI 兼容)
function getEndpoint(model) {
  const BASE = config.ai.baseUrl;
  if (model === 'gpt-image-2') return BASE.replace(/\/v1$/, '') + '/v1/images/generations';
  return BASE + '/chat/completions';
}

function getApiKey() {
  return config.ai.apiKey;
}

async function processJob(job) {
  if (!job?.id) return;
  activeJobIds.add(job.id);
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
    const endpoint = getEndpoint(mapping.model);
    const apiKey = getApiKey();
    const aiParams = {
      model: mapping.model,
      prompt: params.prompt,
      ...(mapping.model === 'gpt-image-2' ? { n: 1, size: params.size || '1024x1024' } : {}),
    };
    const result = await aiCaller.aiCaller.call(endpoint, apiKey, aiParams, { modelName: mapping.model });

    await jobQueueService.updateProgress(job.id, 90);

    // 完成任务
    await jobQueueService.completeJob(job.id, {
      ...result,
      task_type: job.task_type,
      completed_at: new Date().toISOString(),
    });

    logger.info(`[Worker] Job #${job.id} (${job.task_type}) completed`);
  } catch (err) {
    logger.error(`[Worker] Job #${job.id} failed: ${err.message}`);
    await jobQueueService.failJob(job.id, err.message);
  } finally {
    activeJobIds.delete(job.id);
  }
}

let _consecutiveErrors = 0;
const MAX_BACKOFF = 120000; // 最大退避 2 分钟

async function poll() {
  while (running) {
    try {
      const available = MAX_CONCURRENT - activeJobIds.size;
      if (available > 0) {
        const limit = Math.min(BATCH_SIZE, available);
        const jobs = await jobQueueService.fetchPending(limit);
        for (const job of jobs) {
          processJob(job).catch(err => logger.error('[Worker] Unhandled job error:', err.message));
        }
      }
      _consecutiveErrors = 0;
    } catch (err) {
      _consecutiveErrors++;
      const backoff = Math.min(POLL_INTERVAL * Math.pow(2, Math.min(_consecutiveErrors, 6)), MAX_BACKOFF);
      logger.error(`[Worker] Poll error (consecutive=${_consecutiveErrors}, backoff=${backoff}ms): ${err.message}`);
      await new Promise(resolve => setTimeout(resolve, backoff));
      continue;
    }
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
  }
}

// 优雅退出
process.on('SIGTERM', async () => {
  logger.info('[Worker] SIGTERM received, shutting down...');
  running = false;
  await waitForJobs();
  process.exit(0);
});
process.on('SIGINT', async () => {
  logger.info('[Worker] SIGINT received, shutting down...');
  running = false;
  await waitForJobs();
  process.exit(0);
});

async function waitForJobs() {
  if (activeJobIds.size <= 0) return;
  logger.info(`[Worker] Waiting for ${activeJobIds.size} in-flight job(s)...`);
  const deadline = Date.now() + 30000; // 30s 硬超时
  await new Promise(resolve => {
    const check = setInterval(() => {
      if (activeJobIds.size <= 0 || Date.now() >= deadline) {
        clearInterval(check);
        if (activeJobIds.size > 0) {
          logger.warn(`[Worker] Timeout waiting for ${activeJobIds.size} job(s), force exit`);
        }
        resolve();
      }
    }, 500);
  });
}

// 定期扫描卡住任务（Worker 崩溃后残留 processing 状态）
setInterval(async () => {
  try {
    const recovered = await jobQueueService.recoverStuckJobs();
    if (recovered > 0) logger.warn(`[Worker] Recovered ${recovered} stuck job(s)`);
  } catch (err) { logger.error(`[Worker] Stuck-job scan error: ${err.message}`); }
}, 30000).unref();

logger.info('[Worker] Job queue worker started');

// 启动时校验 API Key
const startupKey = config.ai?.apiKey;
if (!startupKey || startupKey === 'sk-your-api-key-here') {
  logger.warn('[Worker] AI API Key 未配置或为默认值，所有 AI 任务将失败');
}
poll();
