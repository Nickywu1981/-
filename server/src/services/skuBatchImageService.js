/**
 * SKU Batch Image Service — 多SKU批量图片/视频生成编排
 *
 * 基于 batchService + imageService 扩展的 SKU 维度批量编排
 * 核心流程：商品图+SKU矩阵 → 计算总规格数 → 逐SKU生成 → 聚合结果
 */
import { gatewayRoute } from '../gateway/aiGatewayHub.js';
import logger from '../utils/logger.js';
import { BusinessError } from '../utils/businessError.js';
import { ERROR_CODE } from '../constants/errorCode.js';

// 平台尺寸映射
const PLATFORM_SIZES = {
  taobao:      { width: 800,  height: 800 },
  pinduoduo:   { width: 750,  height: 750 },
  douyin:      { width: 1080, height: 1080 },
  xiaohongshu: { width: 1080, height: 1440 },
  amazon:      { width: 2000, height: 2000 },
  shopee:      { width: 800,  height: 800 },
  lazada:      { width: 800,  height: 800 },
  temu:        { width: 800,  height: 800 },
  shein:       { width: 800,  height: 800 },
  tiktok_shop: { width: 1080, height: 1080 },
};

// 视频平台规格
const PLATFORM_VIDEO_SPECS = {
  taobao:      { aspect: '1:1', maxDuration: 60,  codec: 'h264' },
  douyin:      { aspect: '9:16', maxDuration: 60,  codec: 'h264' },
  pinduoduo:   { aspect: '1:1', maxDuration: 30,  codec: 'h264' },
  xiaohongshu: { aspect: '3:4', maxDuration: 60,  codec: 'h264' },
  tiktok:      { aspect: '9:16', maxDuration: 60,  codec: 'h264' },
  youtube:     { aspect: '16:9', maxDuration: 900, codec: 'h264' },
};

// 内存任务存储 (生产应换 Redis)
const taskStore = new Map();
const TASK_TTL_MS = 60 * 60 * 1000; // 1 小时自动清理

// 每 10 分钟清理过期任务
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [id, task] of taskStore) {
    const createdAt = new Date(task.createdAt).getTime();
    if (now - createdAt > TASK_TTL_MS) {
      taskStore.delete(id);
    }
  }
}, 10 * 60 * 1000);

if (cleanupTimer.unref) cleanupTimer.unref(); // 不阻止进程退出

/**
 * 提交批量图片生成任务
 */
export async function submitImageBatch(params, userId) {
  const { imageUrl, skus, platforms, types, quality } = params;
  const totalCount = skus.length * platforms.length * types.length;

  const taskId = `skui_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const task = {
    id: taskId,
    userId,
    type: 'image_batch',
    status: 'queued',
    totalCount,
    completedCount: 0,
    results: [],
    createdAt: new Date().toISOString(),
  };

  taskStore.set(taskId, task);

  // 异步执行 (不阻塞响应)
  processImageBatch(taskId, { imageUrl, skus, platforms, types, quality }).catch(err => {
    logger.error('[SKUBatch] async processing failed', { taskId, error: err.message });
    const t = taskStore.get(taskId);
    if (t) { t.status = 'failed'; t.error = err.message; }
  });

  return task;
}

async function processImageBatch(taskId, params) {
  const { imageUrl, skus, platforms, types, quality } = params;
  const task = taskStore.get(taskId);
  if (!task) return;

  task.status = 'processing';

  for (const sku of skus) {
    for (const platform of platforms) {
      const size = PLATFORM_SIZES[platform] || PLATFORM_SIZES.taobao;
      for (const type of types) {
        const prompt = buildImagePrompt({ sku, platform, type, size, quality });
        try {
          const result = await gatewayRoute({
            mode: 'single',
            taskType: 'image_gen',
            params: {
              model: quality === 'high' ? 'flux-1.1-pro' : 'qwen-turbo',
              messages: [{ role: 'user', content: prompt }],
              image_url: imageUrl,
              size: `${size.width}x${size.height}`,
            },
          });

          task.results.push({
            sku,
            platform,
            type,
            size,
            url: result?.output?.data?.[0]?.url || result?.output?.url,
            status: 'done',
          });
        } catch (err) {
          logger.warn('[SKUBatch] individual generation failed', { sku, platform, type, error: err.message });
          task.results.push({ sku, platform, type, size, status: 'failed', error: err.message });
        }

        task.completedCount++;
      }
    }
  }

  task.status = 'done';
  task.completedAt = new Date().toISOString();
  taskStore.set(taskId, task);
}

function buildImagePrompt({ sku, platform, type, size, quality }) {
  const parts = [];
  if (sku.color) parts.push(`颜色:${sku.color}`);
  if (sku.angle && sku.angle !== 'front') parts.push(`角度:${sku.angle === 'back' ? '背面' : sku.angle === 'side' ? '侧面' : sku.angle === 'detail' ? '细节' : '俯视'}`);
  if (platform) parts.push(`尺寸:${size.width}x${size.height}`);

  const typeMap = { main: '商品主图', white_bg: '纯白底图', scene: '场景展示图', render: '3D渲染图' };
  const typeLabel = typeMap[type] || '商品图';

  return `生成电商商品${typeLabel}，${parts.join('，')}，${quality === 'high' ? '高清专业摄影级' : '标准电商质量'}，保留商品细节和材质质感`;
}

/**
 * 提交批量视频生成任务
 */
export async function submitVideoBatch(params, userId) {
  const { productImages, skus, platforms, duration, style } = params;
  const totalCount = skus.length * platforms.length;

  const taskId = `skuv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const task = {
    id: taskId,
    userId,
    type: 'video_batch',
    status: 'queued',
    totalCount,
    completedCount: 0,
    results: [],
    createdAt: new Date().toISOString(),
  };

  taskStore.set(taskId, task);

  processVideoBatch(taskId, { productImages, skus, platforms, duration, style }).catch(err => {
    logger.error('[SKUBatch] async video processing failed', { taskId, error: err.message });
    const t = taskStore.get(taskId);
    if (t) { t.status = 'failed'; t.error = err.message; }
  });

  return task;
}

async function processVideoBatch(taskId, params) {
  const { productImages, skus, platforms, duration, style } = params;
  const task = taskStore.get(taskId);
  if (!task) return;

  task.status = 'processing';

  for (const sku of skus) {
    for (const platform of platforms) {
      const spec = PLATFORM_VIDEO_SPECS[platform] || PLATFORM_VIDEO_SPECS.douyin;
      const actualDuration = Math.min(duration, spec.maxDuration);

      try {
        const result = await gatewayRoute({
          mode: 'single',
          taskType: 'video_gen',
          params: {
            model: 'cogvideox',
            messages: [{ role: 'user', content: `生成${actualDuration}秒电商带货短视频，风格:${style}，规格:${spec.aspect}，商品颜色:${sku.color || '默认'}` }],
            image_url: productImages[0],
            duration: actualDuration,
            aspect_ratio: spec.aspect,
          },
        });

        task.results.push({
          sku, platform, spec, duration: actualDuration,
          url: result?.output?.data?.[0]?.url || result?.output?.url,
          status: 'done',
        });
      } catch (err) {
        task.results.push({ sku, platform, spec, status: 'failed', error: err.message });
      }

      task.completedCount++;
    }
  }

  task.status = 'done';
  task.completedAt = new Date().toISOString();
  taskStore.set(taskId, task);
}

/**
 * 获取批量任务状态
 */
export function getTaskStatus(taskId) {
  const task = taskStore.get(taskId);
  if (!task) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND, 'Task not found');
  return {
    id: task.id,
    type: task.type,
    status: task.status,
    totalCount: task.totalCount,
    completedCount: task.completedCount,
    results: task.results,
    createdAt: task.createdAt,
    completedAt: task.completedAt,
  };
}

export default { submitImageBatch, submitVideoBatch, getTaskStatus };
