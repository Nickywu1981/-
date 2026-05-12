/**
 * Movio AI v4.1 — Job Queue Worker
 * G5 后端开发 | W4
 * 独立Worker进程：轮询 job_queue → 调用AI模型 → 更新结果
 * 用法: node server/src/workers/worker.js
 */
// dotenv 由 config/index.js 负责加载
import logger from '../utils/logger.js';
import { BusinessError } from '../utils/businessError.js';
import config, { workerConfig } from '../config/index.js';
import { validateStartupConfig } from '../utils/startupGuard.js';
import * as jobQueueService from '../services/job-queue.service.js';
import { onChildJobComplete } from '../services/unifiedQueueService.js';
import { gatewayInfer } from '../gateway/aiGatewayHub.js';
import { saveSimpleFile } from '../utils/file-upload.js';

// 启动配置校验
validateStartupConfig();

const POLL_INTERVAL = workerConfig.pollInterval;
const BATCH_SIZE = workerConfig.batchSize;
const MAX_CONCURRENT = workerConfig.maxConcurrent;

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
  detail_long_image: { model: 'seedance', action: 'long_image_composite' },
};

async function processJob(job) {
  if (!job?.id) return;
  activeJobIds.add(job.id);

  let params = {};
  try {
    await jobQueueService.updateProgress(job.id, 10);

    const mapping = TASK_MODEL_MAP[job.task_type];
    if (!mapping) {
      await jobQueueService.failJob(job.id, `未知任务类型: ${job.task_type}`);
      return;
    }

    // 解析参数
    try {
      params = typeof job.task_params === 'string' ? JSON.parse(job.task_params) : (job.task_params || {});
    } catch { params = {}; }

    // 增强选项提升：将 enhanced_options 拍平到 params 顶层供 seedance 消费
    if (params.enhanced_options) {
      const eo = params.enhanced_options;
      if (eo.replace_background !== undefined) params.replace_background = eo.replace_background;
      if (eo.background_url) params.background_url = eo.background_url;
      if (eo.replace_clothing !== undefined) params.replace_clothing = eo.replace_clothing;
      if (eo.clothing_style) params.clothing_style = eo.clothing_style;
      if (eo.clothing_color) params.clothing_color = eo.clothing_color;
      if (eo.keep_original_audio) params.keep_original_audio = eo.keep_original_audio;
      if (eo.bgm_url) params.bgm_url = eo.bgm_url;
      if (eo.volume !== undefined) params.volume = eo.volume;
      if (eo.voiceover) params.voiceover = eo.voiceover;
    }

    await jobQueueService.updateProgress(job.id, 30);

    // 长图合成特殊流程：逐场景生成 → Sharp 垂直拼接
    if (job.task_type === 'detail_long_image') {
      return await processLongImageJob(job, params);
    }

    // 调用AI模型 — 统一走 Token Gateway 收口
    const result = await gatewayInfer(mapping.model, { prompt: params.prompt, ...(mapping.model === 'gpt-image-2' ? { n: 1, size: params.size || '1024x1024' } : {}) }, {
      userId: job.user_id || null,
      tenantId: job.tenant_id || null,
      taskType: job.task_type || 'unknown',
      source: 'internal',
    });

    await jobQueueService.updateProgress(job.id, 90);

    // 完成任务
    await jobQueueService.completeJob(job.id, {
      ...result,
      task_type: job.task_type,
      completed_at: new Date().toISOString(),
    });

    logger.info(`[Worker] Job #${job.id} (${job.task_type}) completed`);

    // 批量进度聚合：通知父任务
    if (params.batchId) {
      onChildJobComplete(params.batchId, job.id, 'completed', result).catch(err => logger.warn('[Worker] batch complete notify failed:', err.message));
    }
  } catch (err) {
    logger.error(`[Worker] Job #${job.id} failed: ${err.message}`);
    await jobQueueService.failJob(job.id, err.message);

    // 批量进度聚合：通知父任务子任务失败
    if (params.batchId) {
      onChildJobComplete(params.batchId, job.id, 'failed', { error: err.message }).catch(err2 => logger.warn('[Worker] batch fail notify failed:', err2.message));
    }
  } finally {
    activeJobIds.delete(job.id);
  }
}

async function processLongImageJob(job, params) {
  const scenes = params.scenes || [];
  const outputWidth = params.width || 750;
  const imageBuffers = [];
  const imageMetas = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    try {
      const sizeStr = `${outputWidth}x${Math.round(outputWidth * 16 / 9)}`;
      const genResult = await gatewayInfer('gpt-image-2', { prompt: scene.prompt, n: 1, size: sizeStr }, {
        userId: job.user_id || null,
        tenantId: job.tenant_id || null,
        taskType: 'detail_long_image',
        source: 'internal',
      });
      const imgUrl = genResult?.images?.[0]?.url || genResult?.file_url || genResult?.url;
      if (imgUrl) {
        const resp = await fetch(imgUrl);
        if (!resp.ok) throw new BusinessError(500, `下载场景图失败: HTTP ${resp.status}`);
        const buf = Buffer.from(await resp.arrayBuffer());
        imageBuffers.push(buf);
      }
    } catch (e) {
      logger.warn(`[Worker] Scene ${i} generation failed: ${e.message}`);
    }
    const pct = 30 + Math.round((i + 1) / scenes.length * 40);
    await jobQueueService.updateProgress(job.id, Math.min(pct, 70));
  }

  if (imageBuffers.length === 0) {
    await jobQueueService.failJob(job.id, '所有场景图生成失败');
    return;
  }

  // Sharp 缩放 + 垂直拼接
  const sharp = (await import('sharp')).default;
  const sizedBuffers = [];
  for (const buf of imageBuffers) {
    const resized = await sharp(buf).resize({ width: outputWidth, fit: 'inside', withoutEnlargement: true }).png().toBuffer();
    const meta = await sharp(resized).metadata();
    sizedBuffers.push(resized);
    imageMetas.push({ width: meta.width || outputWidth, height: meta.height || 400 });
  }

  const totalHeight = imageMetas.reduce((sum, m) => sum + m.height, 0);
  const overlays = [];
  let yOffset = 0;
  for (let i = 0; i < sizedBuffers.length; i++) {
    overlays.push({ input: sizedBuffers[i], top: yOffset, left: Math.max(0, Math.floor((outputWidth - imageMetas[i].width) / 2)) });
    yOffset += imageMetas[i].height;
  }

  const compositeBuffer = await sharp({
    create: { width: outputWidth, height: totalHeight, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
  }).composite(overlays).png().toBuffer();

  await jobQueueService.updateProgress(job.id, 85);

  // 保存结果文件
  const fakeFile = {
    originalname: `detail_long_${job.id}.png`,
    buffer: compositeBuffer,
    size: compositeBuffer.length,
    mimetype: 'image/png',
  };
  const saveResult = await saveSimpleFile(fakeFile);
  await jobQueueService.completeJob(job.id, {
    ...saveResult,
    task_type: job.task_type,
    scene_count: imageBuffers.length,
    total_height: totalHeight,
    completed_at: new Date().toISOString(),
  });

  logger.info(`[Worker] Long image composite #${job.id}: ${imageBuffers.length} scenes, ${outputWidth}x${totalHeight}`);
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
