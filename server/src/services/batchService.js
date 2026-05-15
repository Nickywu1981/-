/**
 * 批量处理服务 — 接入真实 AI 引擎
 * 批量队列 / 夜间托管 / 模板复用 / ZIP下载 / 历史复刻 / BullMQ Worker 单张处理
 */
import { infer } from './aiEngine.js';
import { createTask, updateTaskStatus, completeTask, getTask, getPendingTasks, listUserTasks, countUserTasks } from '../dao/taskDao.js';
import * as batchTemplateDao from '../dao/batchTemplateDao.js';
import * as creditService from './creditService.js';
import wsManager from './wsManager.js';
import { BusinessError } from '../utils/businessError.js';
import { BATCH_TASK_STATUS } from '../constants/domainStatus.js';
import { bullConfig } from '../config/index.js';
import logger from '../utils/logger.js';
import { ERROR_CODE } from '../constants/errorCode.js';

const BATCH_CONCURRENCY = bullConfig.batchConcurrency || 5;

const MODEL_MAP = { cutout: 'stable-diffusion-img2img', main_image: 'stable-diffusion-img2img', scene: 'stable-diffusion-xl', enhance: 'stable-diffusion-img2img', white_bg: 'stable-diffusion-img2img', img2video: 'stable-diffusion-xl' };

function safeMsg(err) {
  const msg = err?.message || '';
  return msg.length > 0 && msg.length <= 200 ? msg : msg.substring(0, 200) || '处理失败';
}

// ==================== 批量任务提交 ====================

export async function submitBatchTask(userId, { imageUrls, operation, platform, style, nightMode = false }) {
  const batchSize = imageUrls?.length || 0;
  if (batchSize === 0) throw new BusinessError(ERROR_CODE.PARAM_MISSING);

  const creditMap = { cutout: 'cutout', main_image: 'enhance', scene: 'scene', img2video: 'img2video' };
  const action = creditMap[operation] || operation;
  const discountMultiplier = nightMode ? 0.6 : 1.0;
  const batchMultiplier = batchSize > 1 ? 0.8 : 1.0;

  if (!nightMode) await creditService.consumeCredit(userId, action, batchSize);

  const title = `${nightMode ? '🌙夜间' : ''}批量${operation} × ${batchSize}张`;
  const taskId = await createTask({ userId, type: 'batch', title, inputParams: { imageUrls, operation, platform, style, nightMode, batchSize, discountMultiplier }, priority: nightMode ? 0 : 1 });

  if (nightMode) return { taskId, nightMode: true, estimatedCost: calcCost(action, batchSize, discountMultiplier, batchMultiplier) };

  // 注册任务归属，防止其他用户通过 WebSocket 订阅他人任务
  wsManager.registerTaskOwner(taskId, userId);

  setImmediate(() => processBatch(taskId, userId).catch(err =>
    logger.error('[Batch] setImmediate error:', err.message)
  ));
  return { taskId, estimatedSeconds: batchSize * 5, batchSize };
}

// ==================== 批量执行处理 ====================

async function processBatch(taskId, userId) {
  try {
    const task = await getTask(taskId, userId);
    const { imageUrls = [], operation, nightMode } = task.input_params || {};
    const total = imageUrls.length;

    if (nightMode) {
      const creditMap = { cutout: 'cutout', main_image: 'enhance', scene: 'scene', img2video: 'img2video' };
      try { await creditService.consumeCredit(userId, creditMap[operation] || operation, total); }
      catch (e) { await updateTaskStatus(taskId, userId, { status: 3, errorMsg: safeMsg(e) }); return; }
    }

    await updateTaskStatus(taskId, userId, { status: 1, progress: 0, progressMsg: `0/${total} 处理中...`, workerId: process.pid.toString() });

    const model = MODEL_MAP[operation] || 'stable-diffusion-img2img';
    const results = new Array(total);
    let completed = 0;

    // 受控并发执行（避免同时启动全部任务导致 GPU/RAM 打满）
    async function runOne(i) {
      try {
        const imgResult = await infer(model, {
          imageUrl: imageUrls[i],
          task: operation,
          platform: task.input_params?.platform,
          style: task.input_params?.style,
        });
        results[i] = { original: imageUrls[i], result: imgResult.output?.imageUrl || `/api/images/${taskId}_${i}.webp`, format: 'webp' };
      } catch (err) {
        results[i] = { original: imageUrls[i], error: safeMsg(err), format: 'error' };
        logger.warn(`[Batch] item ${i} failed: ${safeMsg(err)}`);
      }
      completed++;
      const progress = Math.round((completed / total) * 100);
      await updateTaskStatus(taskId, userId, { progress, progressMsg: `${completed}/${total} 完成` });
      wsManager.pushProgress(taskId, progress, 'processing');
    }

    for (let i = 0; i < total; i += BATCH_CONCURRENCY) {
      const chunk = [];
      for (let j = i; j < Math.min(i + BATCH_CONCURRENCY, total); j++) {
        chunk.push(runOne(j));
      }
      await Promise.all(chunk);
    }

    await completeTask(taskId, userId, { progressMsg: '全部完成', outputResult: { results, total, batchId: taskId, zipUrl: `/api/batch/${taskId}/download`, estimatedZipSize: `${Math.round(total * 0.5)}MB` } });
    wsManager.pushTaskComplete(taskId, { results, total });
    wsManager.unregisterTask(taskId);
  } catch (err) {
    await updateTaskStatus(taskId, userId, { status: 3, errorMsg: safeMsg(err) });
    wsManager.unregisterTask(taskId);
  }
}

// ==================== 夜间批量托管 ====================

export async function processNightBatchJobs() {
  const tasks = await getPendingTasks(50);
  const nightTasks = tasks.filter((t) => t.input_params?.nightMode);
  logger.info(`[NightBatch] 触发夜间批量: ${nightTasks.length} 个任务`);
  for (const task of nightTasks) setImmediate(() => processBatch(task.id, task.user_id).catch(err =>
    logger.error('[NightBatch] setImmediate error:', err.message)
  ));
  return { processed: nightTasks.length };
}

// ==================== 批量模板 ====================

export async function saveBatchTemplate(userId, { name, operation, platform, style, nightMode, imageCount }) {
  if (!name || !operation) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
  return batchTemplateDao.insertTemplate(userId, { name, operation, platform, style, nightMode, imageCount });
}

export async function listBatchTemplates(userId) { return batchTemplateDao.listTemplates(userId); }

export async function deleteBatchTemplate(userId, templateId) {
  const t = await batchTemplateDao.getTemplate(templateId, userId);
  if (!t) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  await batchTemplateDao.deleteTemplate(templateId, userId);
}

// ==================== 历史复刻 ====================

export async function redoBatchTask(userId, sourceTaskId) {
  const source = await getTask(sourceTaskId, userId);
  if (!source) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  const { imageUrls, operation, platform, style, nightMode } = source.input_params || {};
  return submitBatchTask(userId, { imageUrls, operation, platform, style, nightMode });
}

export async function listBatchHistory(userId, { page = 1, pageSize = 10 }) {
  const list = await listUserTasks(userId, { type: 'batch', page, pageSize });
  const total = await countUserTasks(userId, { type: 'batch' });
  return { list, total, page, pageSize };
}

// ==================== ZIP 下载 ====================

export async function getBatchZipUrl(taskId, userId) {
  const task = await getTask(taskId, userId);
  if (!task || task.type !== 'batch') throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  if (task.status !== BATCH_TASK_STATUS.COMPLETED) throw new BusinessError(ERROR_CODE.PARAM_ERROR);
  return { zipUrl: `/api/batch/${taskId}/download`, total: task.output_result?.total || 0, estimatedSize: `${Math.round((task.output_result?.total || 0) * 0.5)}MB` };
}

// ==================== 任务查询 ====================

export async function getTaskResult(taskId, userId) {
  const task = await getTask(taskId, userId);
  if (!task) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  return task;
}

// ==================== 队列 Worker 单张处理 ====================

export async function processSingle({ _userId, taskId, imageUrl, taskType, params, onProgress }) {
  onProgress?.(5);
  const model = MODEL_MAP[taskType] || 'stable-diffusion-img2img';
  const result = await infer(model, { imageUrl, task: taskType, ...params }, { onProgress: (p) => onProgress?.(Math.round(5 + p * 0.9)) });
  onProgress?.(100);
  return { taskId, imageUrl, result: { url: result.output?.imageUrl || imageUrl, ...result.output }, taskType };
}

function calcCost(action, batchSize, nightDiscount, batchDiscount) {
  const baseCost = { cutout: 1, main_image: 3, scene: 2, img2video: 10 }[action] || 1;
  return Math.ceil(baseCost * batchSize * batchDiscount * nightDiscount);
}
