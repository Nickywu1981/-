/**
 * Video Adapter — 对接 NewAPI 视频模型 (cogvideo / seedance)
 * 支持: 文生视频 / 图生视频 / 动作迁移 / 数字人 / 批量渲染
 * 端点: NewAPI 统一代理 → 异步任务轮询模式
 */
import { registerModel } from '../aiEngine.js';
import { BusinessError } from '../../utils/businessError.js';
import { adapterConfig } from '../../config/index.js';
import logger from '../../utils/logger.js';

const API_KEY = adapterConfig.openai.apiKey;
const BASE_URL = adapterConfig.openai.baseUrl;

// ==================== 视频任务提交 ====================

async function submitVideoTask(modelId, input) {
  const { prompt, imageUrl, videoUrl, duration = 5, resolution = '1080p', action, fps = 24 } = input;

  const body = {
    model: modelId,
    prompt,
    image_url: imageUrl || undefined,
    video_url: videoUrl || undefined,
    duration,
    resolution,
    action: action || 'generate',
    fps,
  };

  // 移除 undefined 字段
  Object.keys(body).forEach((k) => body[k] === undefined && delete body[k]);

  const res = await fetch(`${BASE_URL}/video/generations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    logger.error(`[Video] ${modelId} 提交失败 ${res.status}: ${err.error?.message || res.statusText}`);
    throw new BusinessError(502, '视频生成服务暂时不可用，请稍后重试');
  }

  return res.json();
}

// ==================== 视频任务轮询 ====================

async function pollVideoTask(taskId, onProgress, timeoutMs = 600000) {
  const startTime = Date.now();
  let lastProgress = 0;

  while (Date.now() - startTime < timeoutMs) {
    const res = await fetch(`${BASE_URL}/video/generations/${taskId}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      logger.error(`[Video] 轮询失败 ${res.status}: ${err.error?.message || res.statusText}`);
      throw new BusinessError(502, '视频生成查询失败，请稍后重试');
    }

    const data = await res.json();

    if (data.status === 'completed') {
      onProgress?.(100);
      return data;
    }

    if (data.status === 'failed') {
      throw new BusinessError(500, `视频生成失败: ${data.error || '未知错误'}`);
    }

    const progress = data.progress || 0;
    if (progress > lastProgress) {
      lastProgress = progress;
      onProgress?.(progress);
    }

    await new Promise((r) => setTimeout(r, adapterConfig.pollIntervalMs.video));
  }

  throw new BusinessError(504, '视频生成超时');
}

// ==================== 通用视频推断工厂 ====================

function makeVideoInfer(modelId) {
  return async function infer(input, onProgress) {
    if (!API_KEY) throw new BusinessError(503, 'OPENAI_API_KEY 未配置，视频模型不可用');

    onProgress?.(5);

    const submitResult = await submitVideoTask(modelId, input);

    onProgress?.(10);

    const taskId = submitResult.id || submitResult.task_id;
    if (!taskId) {
      // 同步返回（部分模型直接返回结果）
      if (submitResult.output?.video_url || submitResult.video_url) {
        onProgress?.(100);
        return {
          videoUrl: submitResult.output?.video_url || submitResult.video_url,
          model: modelId,
          mode: 'sync',
        };
      }
      throw new BusinessError(500, `${modelId} 未返回任务ID`);
    }

    const result = await pollVideoTask(taskId, (p) => onProgress?.(10 + p * 0.9), 600000);

    return {
      videoUrl: result.output?.video_url || result.video_url,
      thumbnailUrl: result.output?.thumbnail_url || null,
      duration: result.output?.duration || null,
      model: modelId,
      taskId,
      mode: 'async',
    };
  };
}

// ==================== 动作迁移专用推断 ====================

async function actionMigrateInfer(input, onProgress) {
  const fn = makeVideoInfer('seedance');
  return fn({ ...input, action: 'action_migrate' }, onProgress);
}

// ==================== 批量视频生成 ====================

async function batchVideoInfer(input, onProgress) {
  const { prompts = [], duration = 5, resolution = '1080p' } = input;
  const results = [];

  for (let i = 0; i < prompts.length; i++) {
    const fn = makeVideoInfer('seedance');
    const result = await fn({ prompt: prompts[i], duration, resolution }, undefined);
    results.push(result);
    onProgress?.(((i + 1) / prompts.length) * 100);
  }

  return { videos: results, count: results.length };
}

// ==================== 健康检查 ====================

async function health(modelId) {
  if (!API_KEY) return { status: 'no-api-key', provider: modelId };
  return { status: 'ok', provider: modelId };
}

// ==================== 注册 ====================

export async function registerVideo() {
  if (!API_KEY) {
    logger.warn('[AI] OPENAI_API_KEY 未配置，视频模型将跳过注册');
    return;
  }

  registerModel({
    id: 'seedance',
    type: 'video',
    infer: makeVideoInfer('seedance'),
    health: () => health('seedance'),
    provider: 'openai',
  });

  registerModel({
    id: 'cogvideo',
    type: 'video',
    infer: makeVideoInfer('cogvideo'),
    health: () => health('cogvideo'),
    provider: 'openai',
  });

  registerModel({
    id: 'seedance-action-migrate',
    type: 'video',
    infer: actionMigrateInfer,
    health: () => health('seedance-action-migrate'),
    provider: 'openai',
  });

  registerModel({
    id: 'seedance-batch',
    type: 'video',
    infer: batchVideoInfer,
    health: () => health('seedance-batch'),
    provider: 'openai',
  });

  logger.info('[AI] 视频模型已注册: seedance, cogvideo, seedance-action-migrate, seedance-batch');
}
