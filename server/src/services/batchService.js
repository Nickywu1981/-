/**
 * 批量处理服务 — 第四阶段核心
 * 批量队列 / 夜间托管 / 模板复用 / ZIP下载 / 历史复刻
 */

import { createTask, updateTaskStatus, completeTask, getTask, getPendingTasks, listUserTasks, countUserTasks } from '../dao/taskDao.js';
import * as batchTemplateDao from '../dao/batchTemplateDao.js';
import * as creditService from './creditService.js';
import wsManager from './wsManager.js';

// ==================== 批量任务提交 ====================

export async function submitBatchTask(userId, { imageUrls, operation, platform, style, nightMode = false }) {
  const batchSize = imageUrls?.length || 0;
  if (batchSize === 0) {
    const err = new Error('请上传至少一张图片');
    err.statusCode = 400;
    throw err;
  }

  const creditMap = { cutout: 'cutout', main_image: 'enhance', scene: 'scene', img2video: 'img2video' };
  const action = creditMap[operation] || operation;

  // 夜间模式 6折
  const discountMultiplier = nightMode ? 0.6 : 1.0;
  const batchMultiplier = batchSize > 1 ? 0.8 : 1.0;

  // 夜间模式先不扣费，执行时再扣
  if (!nightMode) {
    await creditService.consumeCredit(userId, action, batchSize);
  }

  const title = `${nightMode ? '🌙夜间' : ''}批量${operation} × ${batchSize}张`;
  const taskId = await createTask({
    userId, type: 'batch', title,
    inputParams: { imageUrls, operation, platform, style, nightMode, batchSize, discountMultiplier },
    priority: nightMode ? 0 : 1, // 低优先级排队
  });

  if (nightMode) {
    // 夜间模式不立即执行，由 cron 定时任务触发
    return { taskId, nightMode: true, estimatedCost: calcCost(action, batchSize, discountMultiplier, batchMultiplier) };
  }

  setImmediate(() => processBatch(taskId, userId));

  return { taskId, estimatedSeconds: batchSize * 5, batchSize };
}

// ==================== 批量执行处理 ====================

async function processBatch(taskId, userId) {
  try {
    const task = await getTask(taskId, userId);
    const { imageUrls = [], operation, nightMode } = task.input_params || {};
    const total = imageUrls.length;

    // 夜间任务执行时扣费
    if (nightMode) {
      const creditMap = { cutout: 'cutout', main_image: 'enhance', scene: 'scene', img2video: 'img2video' };
      try {
        await creditService.consumeCredit(userId, creditMap[operation] || operation, total);
      } catch (e) {
        await updateTaskStatus(taskId, userId, { status: 3, errorMsg: e.message });
        return;
      }
    }

    await updateTaskStatus(taskId, userId, { status: 1, progress: 0, progressMsg: `0/${total} 处理中...`, workerId: process.pid.toString() });

    const results = [];
    for (let i = 0; i < total; i++) {
      await sleep(600);
      results.push({
        original: imageUrls[i],
        result: `/api/images/${taskId}_${i}.webp`,
        format: 'webp',
      });
      const progress = Math.round(((i + 1) / total) * 100);
      await updateTaskStatus(taskId, userId, { progress, progressMsg: `${i + 1}/${total} 完成` });
      wsManager.pushProgress(taskId, progress, 'processing');
    }

    await completeTask(taskId, userId, {
      progressMsg: '全部完成',
      outputResult: {
        results,
        total,
        batchId: taskId,
        zipUrl: `/api/batch/${taskId}/download`,
        estimatedZipSize: `${Math.round(total * 0.5)}MB`,
      },
    });
    wsManager.pushTaskComplete(taskId, { results, total });
  } catch (err) {
    await updateTaskStatus(taskId, userId, { status: 3, errorMsg: err.message });
  }
}

// ==================== 夜间批量托管 ====================

/**
 * 夜间任务触发 — 由 cron 定时调用（每日凌晨2点）
 * 将所有排队中的夜间批量任务推入执行
 */
export async function processNightBatchJobs() {
  const tasks = await getPendingTasks(50);
  const nightTasks = tasks.filter((t) => t.input_params?.nightMode);

  console.log(`[NightBatch] 触发夜间批量: ${nightTasks.length} 个任务`);

  for (const task of nightTasks) {
    setImmediate(() => processBatch(task.id, task.user_id));
  }

  return { processed: nightTasks.length };
}

// ==================== 批量模板 ====================

export async function saveBatchTemplate(userId, { name, operation, platform, style, nightMode, imageCount }) {
  if (!name || !operation) {
    const err = new Error('模板名称和操作类型为必填');
    err.statusCode = 400;
    throw err;
  }
  return batchTemplateDao.insertTemplate(userId, { name, operation, platform, style, nightMode, imageCount });
}

export async function listBatchTemplates(userId) {
  return batchTemplateDao.listTemplates(userId);
}

export async function deleteBatchTemplate(userId, templateId) {
  const t = await batchTemplateDao.getTemplate(templateId, userId);
  if (!t) {
    const err = new Error('模板不存在');
    err.statusCode = 404;
    throw err;
  }
  await batchTemplateDao.deleteTemplate(templateId, userId);
}

// ==================== 历史复刻 ====================

export async function redoBatchTask(userId, sourceTaskId) {
  const source = await getTask(sourceTaskId, userId);
  if (!source) {
    const err = new Error('源任务不存在');
    err.statusCode = 404;
    throw err;
  }

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
  if (!task || task.type !== 'batch') {
    const err = new Error('任务不存在或非批量任务');
    err.statusCode = 404;
    throw err;
  }
  if (task.status !== 2) {
    const err = new Error('任务未完成，无法下载');
    err.statusCode = 400;
    throw err;
  }
  return {
    zipUrl: `/api/batch/${taskId}/download`,
    total: task.output_result?.total || 0,
    estimatedSize: `${Math.round((task.output_result?.total || 0) * 0.5)}MB`,
  };
}

// ==================== 任务查询 ====================

export async function getTaskResult(taskId, userId) {
  const task = await getTask(taskId, userId);
  if (!task) {
    const err = new Error('任务不存在');
    err.statusCode = 404;
    throw err;
  }
  return task;
}

function calcCost(action, batchSize, nightDiscount, batchDiscount) {
  const baseCost = { cutout: 1, main_image: 3, scene: 2, img2video: 10 }[action] || 1;
  const cost = Math.ceil(baseCost * batchSize * batchDiscount * nightDiscount);
  return cost;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ==================== 队列 Worker 单张处理 ====================

/**
 * 供 BullMQ image-processing Worker 调用
 * 处理单张图片，通过 onProgress 回调上报进度
 */
export async function processSingle({ userId, taskId, imageUrl, taskType, params, onProgress }) {
  onProgress?.(5);

  // 根据 taskType 路由到对应处理器
  let result;
  switch (taskType) {
    case 'cutout':
      result = await processRemoveBg(imageUrl, params, onProgress);
      break;
    case 'white_bg':
      result = await processWhiteBg(imageUrl, params, onProgress);
      break;
    case 'scene':
      result = await processScene(imageUrl, params, onProgress);
      break;
    case 'enhance':
      result = await processEnhance(imageUrl, params, onProgress);
      break;
    default:
      result = await processRemoveBg(imageUrl, params, onProgress);
  }

  onProgress?.(100);
  return { taskId, imageUrl, result, taskType };
}

async function processRemoveBg(imageUrl, params, onProgress) {
  onProgress?.(30);
  await sleep(400);
  onProgress?.(60);
  await sleep(300);
  return {
    url: imageUrl.replace(/\.[^.]+$/, '_nobg.webp'),
    format: 'webp',
    size: '1024x1024',
  };
}

async function processWhiteBg(imageUrl, params, onProgress) {
  onProgress?.(30);
  await sleep(350);
  onProgress?.(60);
  await sleep(300);
  return {
    url: imageUrl.replace(/\.[^.]+$/, '_whitebg.webp'),
    backgroundColor: params?.bgColor || '#FFFFFF',
    format: 'webp',
  };
}

async function processScene(imageUrl, params, onProgress) {
  onProgress?.(25);
  await sleep(600);
  onProgress?.(55);
  await sleep(500);
  return {
    url: imageUrl.replace(/\.[^.]+$/, '_scene.webp'),
    scene: params?.scene || 'default',
    format: 'webp',
  };
}

async function processEnhance(imageUrl, params, onProgress) {
  onProgress?.(20);
  await sleep(500);
  onProgress?.(50);
  await sleep(400);
  return {
    url: imageUrl.replace(/\.[^.]+$/, '_enhanced.webp'),
    resolution: '2K',
    format: 'webp',
  };
}
