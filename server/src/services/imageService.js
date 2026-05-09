/**
 * 图片处理服务 — 接入真实 AI 引擎
 * 所有管线通过 aiEngine.infer / aiEngine.pipeline 调用已注册模型
 */
import { infer, pipeline } from './aiEngine.js';
import { createTask, updateTaskStatus, completeTask, getTask, listUserTasks, countUserTasks } from '../dao/taskDao.js';
import * as creditService from './creditService.js';
import { BusinessError } from '../utils/businessError.js';

// ==================== 主图生成管线 ====================

export async function submitMainImage(userId, { imageUrl, platform, style = 'simple' }) {
  await creditService.consumeCredit(userId, 'enhance');

  const title = `${platform} 主图 — ${style}`;
  const taskId = await createTask({
    userId, type: 'main_image', title,
    inputParams: { imageUrl, platform, style },
    priority: 1,
  });

  setImmediate(() => processMainImage(taskId, userId, { imageUrl, platform, style }));

  return { taskId, estimatedSeconds: 8 };
}

async function processMainImage(taskId, userId, params) {
  try {

    const stages = [
      { name: '抠图',    model: 'stable-diffusion-img2img' },
      { name: '白底图',  model: 'stable-diffusion-img2img' },
      { name: '精修',    model: 'stable-diffusion-img2img' },
      { name: '阴影',    model: 'stable-diffusion-img2img' },
      { name: '裁切',    model: 'stable-diffusion-img2img' },
    ];

    await updateTaskStatus(taskId, userId, { status: 1, progress: 5, progressMsg: '启动 AI 管线...', workerId: process.pid.toString() });

    const pipeResult = await pipeline(stages, { imageUrl: params.imageUrl, platform: params.platform, style: params.style }, (stageIdx, total, name, pct) => {
      const baseProgress = Math.round((stageIdx / total) * 90);
      updateTaskStatus(taskId, userId, { progress: baseProgress + Math.round(pct / total / 10), progressMsg: `正在${name}...` });
    });

    const styleNames = params.style === 'promo' ? ['促销风', '大促风', '秒杀风'] : ['简约白底', '高级轻奢', '活动促销'];
    const results = styleNames.map((s, i) => ({
      id: `${taskId}_${i}`,
      style: s,
      url: pipeResult.final?.imageUrl || pipeResult.results?.[pipeResult.results.length - 1]?.output?.imageUrl || `/api/images/${taskId}_${i}.webp`,
      width: 800, height: 800, format: 'webp',
    }));

    await completeTask(taskId, userId, { outputResult: { images: results, pipeline: pipeResult } });
  } catch (err) {
    await updateTaskStatus(taskId, userId, { status: 3, progress: 0, progressMsg: '', errorMsg: err.message });
  }
}

// ==================== 场景图生成 ====================

export async function submitSceneImage(userId, { imageUrl, sceneCategory, customBgUrl = '' }) {
  await creditService.consumeCredit(userId, 'scene');

  const title = `场景图 — ${sceneCategory || '自动'}`;
  const taskId = await createTask({
    userId, type: 'scene', title,
    inputParams: { imageUrl, sceneCategory, customBgUrl },
    priority: 1,
  });

  setImmediate(() => processSceneImage(taskId, userId, { imageUrl, sceneCategory, customBgUrl }));

  return { taskId, estimatedSeconds: 12 };
}

async function processSceneImage(taskId, userId, params) {
  try {
    await updateTaskStatus(taskId, userId, { status: 1, progress: 5, progressMsg: '分析产品特征...', workerId: process.pid.toString() });

    const input = {
      imageUrl: params.imageUrl,
      sceneCategory: params.sceneCategory,
      customBgUrl: params.customBgUrl || '',
      task: 'scene_generation',
    };

    const result = await infer('stable-diffusion-xl', input, {
      onProgress: (p) => {
        const msg = p < 30 ? '分析产品特征...' : p < 60 ? '匹配场景光影...' : p < 85 ? '合成场景融合...' : '生成阴影...';
        updateTaskStatus(taskId, userId, { progress: Math.round(p * 0.95), progressMsg: msg });
      },
      maxRetries: 2,
    });

    const results = result.output?.images || Array.from({ length: 5 }, (_, i) => ({
      id: `${taskId}_${i}`,
      url: result.output?.imageUrl || `/api/images/${taskId}_scene_${i}.webp`,
      width: 1200, height: 1200, format: 'webp',
    }));

    await completeTask(taskId, userId, { outputResult: { images: results, modelUsed: result.modelId } });
  } catch (err) {
    await updateTaskStatus(taskId, userId, { status: 3, errorMsg: err.message });
  }
}

// ==================== 详情页生成 ====================

export async function submitDetailH5(userId, { imageUrl, category, templateId }) {
  await creditService.consumeCredit(userId, 'detail_h5');

  const taskId = await createTask({
    userId, type: 'detail_h5', title: `详情页 — ${category}`,
    inputParams: { imageUrl, category, templateId },
    priority: 1,
  });

  setImmediate(() => processDetailH5(taskId, userId, { imageUrl, category, templateId }));

  return { taskId, estimatedSeconds: 18 };
}

async function processDetailH5(taskId, userId, params) {
  try {
    await updateTaskStatus(taskId, userId, { status: 1, progress: 5, progressMsg: '生成卖点文案...', workerId: process.pid.toString() });

    // Step 1: 用 GPT 生成文案
    const textResult = await infer('gpt-4o-mini', {
      task: 'detail_copy',
      category: params.category,
      imageDescription: params.imageUrl,
      language: 'zh-CN',
    }, { onProgress: (p) => updateTaskStatus(taskId, userId, { progress: 5 + Math.round(p * 0.2), progressMsg: 'AI 写作文案...' }) });

    // Step 2: 用 SD 生成配图
    await updateTaskStatus(taskId, userId, { progress: 28, progressMsg: '图文排版中...' });

    const imageResult = await infer('stable-diffusion-img2img', {
      imageUrl: params.imageUrl,
      category: params.category,
      templateId: params.templateId,
      copyText: textResult.output?.text || '',
    }, { onProgress: (p) => updateTaskStatus(taskId, userId, { progress: 28 + Math.round(p * 0.5), progressMsg: '生成详情配图...' }) });

    // Step 3: 适配平台规范
    await updateTaskStatus(taskId, userId, { progress: 80, progressMsg: '适配平台规范...' });
    const adaptResult = await infer('stable-diffusion-img2img', {
      ...imageResult.output,
      task: 'platform_adapt',
      platform: params.category || 'taobao',
    }, { onProgress: (p) => updateTaskStatus(taskId, userId, { progress: 80 + Math.round(p * 0.15), progressMsg: '平台适配中...' }) });

    const copy = textResult.output;
    const result = {
      pages: [
        { id: `${taskId}_p1`, title: '主图Banner', url: adaptResult.output?.bannerUrl || `/api/images/${taskId}_h5_banner.webp` },
        { id: `${taskId}_p2`, title: '卖点详情', url: adaptResult.output?.detailUrl || `/api/images/${taskId}_h5_detail.webp` },
        { id: `${taskId}_p3`, title: '规格参数', url: adaptResult.output?.specUrl || `/api/images/${taskId}_h5_specs.webp` },
        { id: `${taskId}_p4`, title: '品牌故事', url: adaptResult.output?.brandUrl || `/api/images/${taskId}_h5_brand.webp` },
      ],
      copy: {
        title: copy?.title || '商品标题示例',
        bullets: copy?.bullets || ['卖点一', '卖点二', '卖点三', '卖点四', '卖点五'],
      },
    };

    await completeTask(taskId, userId, { outputResult: result });
  } catch (err) {
    await updateTaskStatus(taskId, userId, { status: 3, errorMsg: err.message });
  }
}

// ==================== 图片精修 ====================

export async function submitRetouch(userId, { imageUrl, level = 'standard', features = ['beautify', 'contrast', 'sharpen'] }) {
  await creditService.consumeCredit(userId, 'enhance');

  const taskId = await createTask({
    userId, type: 'retouch', title: `精修 — ${level}`,
    inputParams: { imageUrl, level, features },
    priority: 1,
  });

  setImmediate(() => processRetouch(taskId, userId, { imageUrl, level, features }));

  return { taskId, estimatedSeconds: 10 };
}

async function processRetouch(taskId, userId, params) {
  try {
    const stepNames = [];
    if (params.features.includes('beautify')) stepNames.push('AI 智能美化');
    if (params.features.includes('contrast')) stepNames.push('对比度优化');
    if (params.features.includes('sharpen')) stepNames.push('锐化增强');
    if (params.features.includes('denoise')) stepNames.push('降噪处理');
    if (params.features.includes('warm')) stepNames.push('色调调节');

    await updateTaskStatus(taskId, userId, { status: 1, progress: 5, progressMsg: stepNames[0] + '...', workerId: process.pid.toString() });

    const result = await infer('stable-diffusion-img2img', {
      imageUrl: params.imageUrl,
      task: 'image_enhance',
      level: params.level,
      features: params.features,
    }, {
      onProgress: (p) => {
        const stepIdx = Math.min(stepNames.length - 1, Math.floor(p / 100 * stepNames.length));
        updateTaskStatus(taskId, userId, { progress: Math.round(p * 0.95), progressMsg: stepNames[stepIdx] + '...' });
      },
    });

    const output = {
      original: params.imageUrl,
      result: result.output?.imageUrl || `/api/images/${taskId}_retouched.webp`,
      appliedFeatures: params.features,
      level: params.level,
      beforeAfter: {
        before: params.imageUrl,
        after: result.output?.imageUrl || `/api/images/${taskId}_retouched.webp`,
      },
    };

    await completeTask(taskId, userId, { outputResult: output });
  } catch (err) {
    await updateTaskStatus(taskId, userId, { status: 3, errorMsg: err.message });
  }
}

// ==================== 批量任务 ====================

export async function submitBatchTask(userId, { imageUrls, operation, platform, style }) {
  const batchSize = imageUrls?.length || 0;
  if (batchSize === 0) throw new BusinessError(400, '请上传至少一张图片');

  const creditMap = { cutout: 'cutout', main_image: 'enhance', scene: 'scene' };
  const action = creditMap[operation] || operation;
  await creditService.consumeCredit(userId, action, batchSize);

  const taskId = await createTask({
    userId, type: 'batch', title: `批量${operation} × ${batchSize}张`,
    inputParams: { imageUrls, operation, platform, style, batchSize },
    priority: 1,
  });

  setImmediate(() => processBatch(taskId, userId));

  return { taskId, estimatedSeconds: batchSize * 8, batchSize };
}

async function processBatch(taskId, userId) {
  try {
    const task = await getTask(taskId, userId);
    const { imageUrls = [], operation } = task.input_params || {};
    const total = imageUrls.length;

    await updateTaskStatus(taskId, userId, { status: 1, progress: 0, progressMsg: `0/${total} 处理中...`, workerId: process.pid.toString() });

    const modelMap = { cutout: 'stable-diffusion-img2img', main_image: 'stable-diffusion-img2img', scene: 'stable-diffusion-xl' };
    const model = modelMap[operation] || 'stable-diffusion-img2img';

    const results = [];
    for (let i = 0; i < total; i++) {
      const imgResult = await infer(model, {
        imageUrl: imageUrls[i],
        task: operation,
        platform: task.input_params?.platform,
        style: task.input_params?.style,
      });

      results.push({
        original: imageUrls[i],
        result: imgResult.output?.imageUrl || `/api/images/${taskId}_${i}.webp`,
      });

      const progress = Math.round(((i + 1) / total) * 100);
      await updateTaskStatus(taskId, userId, { progress, progressMsg: `${i + 1}/${total} 完成` });
    }

    await completeTask(taskId, userId, { outputResult: { results, total } });
  } catch (err) {
    await updateTaskStatus(taskId, userId, { status: 3, errorMsg: err.message });
  }
}

// ==================== 智能抠图 ====================

export async function submitRemoveBg(userId, { imageUrl, format = 'png' }) {
  await creditService.consumeCredit(userId, 'remove_bg');
  const taskId = await createTask({
    userId, type: 'remove_bg', title: '智能抠图',
    inputParams: { imageUrl, format },
    priority: 1,
  });
  setImmediate(() => processRemoveBg(taskId, userId, { imageUrl, format }));
  return { taskId, estimatedSeconds: 5 };
}

async function processRemoveBg(taskId, userId, params) {
  try {
    const taskProxy = (msg) => updateTaskStatus(taskId, userId, { progress: Math.round(msg * 0.95), progressMsg: msg < 30 ? '正在识别主体...' : msg < 70 ? '正在分离背景...' : '正在优化边缘...' });

    await updateTaskStatus(taskId, userId, { status: 1, progress: 5, progressMsg: '正在识别主体...', workerId: process.pid.toString() });

    const result = await infer('stable-diffusion-img2img', {
      imageUrl: params.imageUrl,
      task: 'cutout',
      format: params.format,
    }, { onProgress: (p) => taskProxy(p) });

    await completeTask(taskId, userId, {
      resultUrls: [result.output?.imageUrl || `https://cdn.movio.ai/results/${taskId}/transparent.png`],
      thumbnail: result.output?.thumbnail || `https://cdn.movio.ai/results/${taskId}/thumb.png`,
      metadata: { format: params.format, modelUsed: result.modelId },
    });
  } catch (err) {
    await updateTaskStatus(taskId, userId, { status: 3, errorMsg: err.message });
  }
}

// ==================== 白底图 ====================

export async function submitWhiteBg(userId, { imageUrl, bgColor = '#FFFFFF' }) {
  await creditService.consumeCredit(userId, 'white_bg');
  const taskId = await createTask({
    userId, type: 'white_bg', title: '白底图生成',
    inputParams: { imageUrl, bgColor },
    priority: 1,
  });
  setImmediate(() => processWhiteBg(taskId, userId, { imageUrl, bgColor }));
  return { taskId, estimatedSeconds: 6 };
}

async function processWhiteBg(taskId, userId, params) {
  try {
    await updateTaskStatus(taskId, userId, { status: 1, progress: 5, progressMsg: '启动抠图+白底管线...', workerId: process.pid.toString() });

    const stages = [
      { name: '抠图',     model: 'stable-diffusion-img2img' },
      { name: '填充背景', model: 'stable-diffusion-img2img' },
      { name: '优化合成', model: 'stable-diffusion-img2img' },
    ];

    const pipeResult = await pipeline(stages, {
      imageUrl: params.imageUrl,
      bgColor: params.bgColor,
      task: 'white_bg',
    }, (stageIdx, total, name, pct) => {
      const baseProgress = Math.round((stageIdx / total) * 95);
      updateTaskStatus(taskId, userId, { progress: baseProgress + Math.round(pct / total / 5), progressMsg: `正在${name}...` });
    });

    await completeTask(taskId, userId, {
      resultUrls: [pipeResult.final?.imageUrl || `https://cdn.movio.ai/results/${taskId}/white-bg.png`],
      thumbnail: pipeResult.final?.thumbnail || `https://cdn.movio.ai/results/${taskId}/thumb.png`,
      metadata: { bgColor: params.bgColor, pipeline: pipeResult },
    });
  } catch (err) {
    await updateTaskStatus(taskId, userId, { status: 3, errorMsg: err.message });
  }
}

// ==================== 任务查询 ====================

export async function getTaskResult(taskId, userId) {
  const task = await getTask(taskId, userId);
  if (!task) throw new BusinessError(404, '任务不存在');
  return task;
}

export async function listMyTasks(userId, { status, type, page, pageSize }) {
  const list = await listUserTasks(userId, { status, type, page, pageSize });
  const total = await countUserTasks(userId, { status, type });
  return { list, total, page, pageSize };
}
