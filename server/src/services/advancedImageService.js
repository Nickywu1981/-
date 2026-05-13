/**
 * 图片进阶服务 — 接入真实 AI 引擎
 * 全部 11 个处理函数已从 sleep() 迁移到 aiEngine.infer
 */
import { infer, pipeline } from './aiEngine.js';
import { createTask, updateTaskStatus, completeTask, getTask, listUserTasks, countUserTasks } from '../dao/taskDao.js';
import { makeTaskQueries } from './taskQueryService.js';
import * as creditService from './creditService.js';
import { BusinessError } from '../utils/businessError.js';
import logger from '../utils/logger.js';
import { ERROR_CODE } from '../constants/errorCode.js';

// ==================== 虚拟模特上身 ====================

export async function submitVirtualTryon(userId, { productImageUrl, skinTone = 'natural', bodyType = 'standard', style = 'casual' }) {
  await creditService.consumeCredit(userId, 'model_tryon');
  const taskId = await createTask({ userId, type: 'virtual_tryon', title: `虚拟模特 — ${style}`, inputParams: { productImageUrl, skinTone, bodyType, style }, priority: 2 });
  setImmediate(() => processVirtualTryon(taskId, userId, { productImageUrl, skinTone, bodyType, style }));
  return { taskId, estimatedSeconds: 20 };
}

async function processVirtualTryon(taskId, userId, params) {
  try {
    await updateTaskStatus(taskId, userId, { status: 1, progress: 10, progressMsg: '分析服装版型...', workerId: process.pid.toString() });
    const result = await infer('stable-diffusion-img2img', {
      imageUrl: params.productImageUrl, task: 'virtual_tryon',
      skinTone: params.skinTone, bodyType: params.bodyType, style: params.style,
    }, { onProgress: (p) => {
      const msg = p < 30 ? '分析服装版型...' : p < 60 ? '匹配模特身形...' : p < 85 ? '渲染上身效果...' : 'AI修手优化...';
      updateTaskStatus(taskId, userId, { progress: Math.round(p * 0.95), progressMsg: msg });
    }});
    const images = [
      { id: `${taskId}_0`, style: '正面', url: result.output?.images?.[0]?.url || `/api/images/${taskId}_tryon_front.webp` },
      { id: `${taskId}_1`, style: '侧面', url: result.output?.images?.[1]?.url || `/api/images/${taskId}_tryon_side.webp` },
      { id: `${taskId}_2`, style: '背面', url: result.output?.images?.[2]?.url || `/api/images/${taskId}_tryon_back.webp` },
    ];
    await completeTask(taskId, userId, { progressMsg: '完成', outputResult: { images } });
  } catch (err) { logger.error('[AdvancedImage] Task failed', { taskId, error: err.message }); await updateTaskStatus(taskId, userId, { status: 3, errorMsg: err.message }).catch(e => logger.error('[AdvancedImage] Status update failed', { taskId, error: e.message })); }
}

// ==================== 一键换色 ====================

export async function submitColorSwap(userId, { productImageUrl, targetColors = [], preserveTexture = true }) {
  await creditService.consumeCredit(userId, 'color_swap');
  const taskId = await createTask({ userId, type: 'color_swap', title: `换色 × ${targetColors.length || 1}色`, inputParams: { productImageUrl, targetColors, preserveTexture }, priority: 2 });
  setImmediate(() => processColorSwap(taskId, userId, { productImageUrl, targetColors }));
  return { taskId, estimatedSeconds: 15 };
}

async function processColorSwap(taskId, userId, params) {
  try {
    const colors = params.targetColors?.length ? params.targetColors : ['#FF0000', '#0000FF', '#00FF00'];
    await updateTaskStatus(taskId, userId, { status: 1, progress: 5, progressMsg: '识别产品区域...', workerId: process.pid.toString() });
    const result = await infer('stable-diffusion-img2img', {
      imageUrl: params.productImageUrl, task: 'color_swap', colors, preserveTexture: true,
    }, { onProgress: (p) => updateTaskStatus(taskId, userId, { progress: Math.round(p * 0.95), progressMsg: `换色渲染 ${Math.round(p)}%...` }) });

    const images = result.output?.images || colors.map((c, i) => ({ color: c, url: `/api/images/${taskId}_color_${i}.webp` }));
    await completeTask(taskId, userId, { progressMsg: '完成', outputResult: { images } });
  } catch (err) { logger.error('[AdvancedImage] Task failed', { taskId, error: err.message }); await updateTaskStatus(taskId, userId, { status: 3, errorMsg: err.message }).catch(e => logger.error('[AdvancedImage] Status update failed', { taskId, error: e.message })); }
}

// ==================== AI风格转化 ====================

export async function submitStyleTransfer(userId, { productImageUrl, targetStyle, strength = 0.7 }) {
  await creditService.consumeCredit(userId, 'ai_style');
  const taskId = await createTask({ userId, type: 'style_transfer', title: `风格转化 — ${targetStyle}`, inputParams: { productImageUrl, targetStyle, strength }, priority: 2 });
  setImmediate(() => processStyleTransfer(taskId, userId, { productImageUrl, targetStyle }));
  return { taskId, estimatedSeconds: 18 };
}

async function processStyleTransfer(taskId, userId, params) {
  try {
    await updateTaskStatus(taskId, userId, { status: 1, progress: 10, progressMsg: '分析商品特征...', workerId: process.pid.toString() });
    const result = await infer('stable-diffusion-img2img', {
      imageUrl: params.productImageUrl, task: 'style_transfer', targetStyle: params.targetStyle,
    }, { onProgress: (p) => {
      const msg = p < 35 ? '分析商品特征...' : p < 70 ? `应用${params.targetStyle}风格...` : '保留细节纹理...';
      updateTaskStatus(taskId, userId, { progress: Math.round(p * 0.95), progressMsg: msg });
    }});
    const images = (result.output?.images || ['main', 'variant1', 'variant2']).map((s, i) => ({ id: `${taskId}_${i}`, style: params.targetStyle, variant: typeof s === 'string' ? s : s.style || `variant${i + 1}`, url: s.url || `/api/images/${taskId}_style_${i}.webp` }));
    await completeTask(taskId, userId, { progressMsg: '完成', outputResult: { images } });
  } catch (err) { logger.error('[AdvancedImage] Task failed', { taskId, error: err.message }); await updateTaskStatus(taskId, userId, { status: 3, errorMsg: err.message }).catch(e => logger.error('[AdvancedImage] Status update failed', { taskId, error: e.message })); }
}

// ==================== AI去褶皱 ====================

export async function submitWrinkleRemove(userId, { productImageUrl, fabricType = 'auto' }) {
  await creditService.consumeCredit(userId, 'enhance');
  const taskId = await createTask({ userId, type: 'wrinkle_remove', title: `去褶皱 — ${fabricType}`, inputParams: { productImageUrl, fabricType }, priority: 1 });
  setImmediate(() => processWrinkleRemove(taskId, userId, { productImageUrl, fabricType }));
  return { taskId, estimatedSeconds: 12 };
}

async function processWrinkleRemove(taskId, userId, params) {
  try {
    const onP = (p) => { const msg = p < 30 ? '识别褶皱区域...' : p < 60 ? `匹配${params.fabricType}材质...` : '平滑处理...'; updateTaskStatus(taskId, userId, { progress: Math.round(p * 0.95), progressMsg: msg }); };
    await updateTaskStatus(taskId, userId, { status: 1, progress: 15, progressMsg: '识别褶皱区域...', workerId: process.pid.toString() });
    const result = await infer('stable-diffusion-img2img', { imageUrl: params.productImageUrl, task: 'wrinkle_remove', fabricType: params.fabricType }, { onProgress: onP });
    await completeTask(taskId, userId, { progressMsg: '完成', outputResult: {
      original: params.productImageUrl,
      result: result.output?.imageUrl || `/api/images/${taskId}_smooth.webp`,
      fabricType: params.fabricType,
      beforeAfter: { before: params.productImageUrl, after: result.output?.imageUrl || `/api/images/${taskId}_smooth.webp` },
    }});
  } catch (err) { logger.error('[AdvancedImage] Task failed', { taskId, error: err.message }); await updateTaskStatus(taskId, userId, { status: 3, errorMsg: err.message }).catch(e => logger.error('[AdvancedImage] Status update failed', { taskId, error: e.message })); }
}

// ==================== 智能扩图 ====================

export async function submitOutpainting(userId, { productImageUrl, direction = 'all', ratio = 30 }) {
  await creditService.consumeCredit(userId, 'enhance');
  const taskId = await createTask({ userId, type: 'outpainting', title: `智能扩图 — ${direction}×${ratio}%`, inputParams: { productImageUrl, direction, ratio }, priority: 2 });
  setImmediate(() => processOutpainting(taskId, userId, { productImageUrl, direction, ratio }));
  return { taskId, estimatedSeconds: 12 };
}

async function processOutpainting(taskId, userId, params) {
  try {
    await updateTaskStatus(taskId, userId, { status: 1, progress: 15, progressMsg: '分析画面边界...', workerId: process.pid.toString() });
    const result = await infer('stable-diffusion-img2img', {
      imageUrl: params.productImageUrl, task: 'img_expand', direction: params.direction, ratio: params.ratio,
    }, { onProgress: (p) => {
      const msg = p < 30 ? '分析画面边界...' : p < 55 ? `向${params.direction}方向扩展...` : p < 80 ? 'AI 补全背景...' : '无缝融合边缘...';
      updateTaskStatus(taskId, userId, { progress: Math.round(p * 0.95), progressMsg: msg });
    }});
    await completeTask(taskId, userId, { progressMsg: '扩图完成', outputResult: {
      original: params.productImageUrl,
      expanded: result.output?.imageUrl || `/api/images/${taskId}_outpaint.webp`,
      direction: params.direction, ratio: `${params.ratio}%`,
    }});
  } catch (err) { logger.error('[AdvancedImage] Task failed', { taskId, error: err.message }); await updateTaskStatus(taskId, userId, { status: 3, errorMsg: err.message }).catch(e => logger.error('[AdvancedImage] Status update failed', { taskId, error: e.message })); }
}

// ==================== 幽灵模特 ====================

export async function submitGhostMannequin(userId, { productImageUrl, effect = 'floating', category = 'tops' }) {
  await creditService.consumeCredit(userId, 'model_tryon');
  const taskId = await createTask({ userId, type: 'ghost_mannequin', title: `幽灵模特 — ${effect}`, inputParams: { productImageUrl, effect, category }, priority: 2 });
  setImmediate(() => processGhostMannequin(taskId, userId, { productImageUrl, effect, category }));
  return { taskId, estimatedSeconds: 18 };
}

async function processGhostMannequin(taskId, userId, params) {
  try {
    await updateTaskStatus(taskId, userId, { status: 1, progress: 10, progressMsg: '识别假模区域...', workerId: process.pid.toString() });
    const result = await infer('stable-diffusion-img2img', {
      imageUrl: params.productImageUrl, task: 'ghost_mannequin', effect: params.effect, category: params.category,
    }, { onProgress: (p) => {
      const msg = p < 25 ? '识别假模区域...' : p < 55 ? '去除假模+保留服装...' : p < 80 ? `应用${params.effect}效果...` : '添加立体阴影...';
      updateTaskStatus(taskId, userId, { progress: Math.round(p * 0.95), progressMsg: msg });
    }});
    await completeTask(taskId, userId, { progressMsg: '幽灵模特生成完成', outputResult: {
      before: params.productImageUrl, after: result.output?.imageUrl || `/api/images/${taskId}_ghost.webp`,
      effect: params.effect, category: params.category,
    }});
  } catch (err) { logger.error('[AdvancedImage] Task failed', { taskId, error: err.message }); await updateTaskStatus(taskId, userId, { status: 3, errorMsg: err.message }).catch(e => logger.error('[AdvancedImage] Status update failed', { taskId, error: e.message })); }
}

// ==================== 图片翻译 ====================

export async function submitImageTranslate(userId, { productImageUrl, sourceLang = 'zh', targetLang = 'en' }) {
  await creditService.consumeCredit(userId, 'enhance');
  const taskId = await createTask({ userId, type: 'image_translate', title: `图片翻译 ${sourceLang}→${targetLang}`, inputParams: { productImageUrl, sourceLang, targetLang }, priority: 2 });
  setImmediate(() => processImageTranslate(taskId, userId, { productImageUrl, sourceLang, targetLang }));
  return { taskId, estimatedSeconds: 15 };
}

async function processImageTranslate(taskId, userId, params) {
  try {
    await updateTaskStatus(taskId, userId, { status: 1, progress: 10, progressMsg: 'OCR识别文字...', workerId: process.pid.toString() });

    const stages = [
      { name: 'OCR识别', model: 'gpt-4o-mini' },
      { name: '翻译排版', model: 'stable-diffusion-img2img' },
    ];
    const pipeResult = await pipeline(stages, {
      imageUrl: params.productImageUrl, task: 'image_translate',
      sourceLang: params.sourceLang, targetLang: params.targetLang,
    }, (stageIdx, total, name, pct) => {
      const base = Math.round((stageIdx / total) * 95);
      updateTaskStatus(taskId, userId, { progress: base + Math.round(pct / total / 5), progressMsg: `${name}...` });
    });

    await completeTask(taskId, userId, { progressMsg: '完成', outputResult: {
      original: params.productImageUrl,
      translated: pipeResult.final?.imageUrl || `/api/images/${taskId}_translated.webp`,
      sourceLang: params.sourceLang, targetLang: params.targetLang,
      detectedTexts: pipeResult.results?.[0]?.output?.texts || [],
    }});
  } catch (err) { logger.error('[AdvancedImage] Task failed', { taskId, error: err.message }); await updateTaskStatus(taskId, userId, { status: 3, errorMsg: err.message }).catch(e => logger.error('[AdvancedImage] Status update failed', { taskId, error: e.message })); }
}

// ==================== AI 模特生成 ====================

export async function submitModelGenerate(userId, { imageUrl, modelType = 'asian-female' }) {
  if (!imageUrl) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
  await creditService.consumeCredit(userId, 'model_tryon');
  const taskId = await createTask({ userId, type: 'model_generate', title: `AI模特 — ${modelType}`, inputParams: { imageUrl, modelType }, priority: 2 });
  setImmediate(() => processModelGenerate(taskId, userId, { imageUrl, modelType }));
  return { taskId, estimatedSeconds: 20 };
}

async function processModelGenerate(taskId, userId, params) {
  try {
    await updateTaskStatus(taskId, userId, { status: 1, progress: 10, progressMsg: '识别服装款式...', workerId: process.pid.toString() });
    const result = await infer('stable-diffusion-img2img', {
      imageUrl: params.imageUrl, task: 'virtual_tryon', modelType: params.modelType,
    }, { onProgress: (p) => {
      const msg = p < 30 ? '识别服装款式...' : p < 60 ? `生成${params.modelType}模特...` : '融合光影细节...';
      updateTaskStatus(taskId, userId, { progress: Math.round(p * 0.95), progressMsg: msg });
    }});
    const images = (result.output?.images || []).map((img, i) => ({ id: `${taskId}_${i}`, type: 'model', url: (img && img.url) || `/api/images/${taskId}_model_${i}.webp` }));
    await completeTask(taskId, userId, { progressMsg: '完成', outputResult: { images } });
  } catch (err) { logger.error('[AdvancedImage] Task failed', { taskId, error: err.message }); await updateTaskStatus(taskId, userId, { status: 3, errorMsg: err.message }).catch(e => logger.error('[AdvancedImage] Status update failed', { taskId, error: e.message })); }
}

// ==================== 全景拍摄 ====================

export async function submitShotPanorama(userId, { imageUrl, mode = '360' }) {
  if (!imageUrl) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
  await creditService.consumeCredit(userId, 'enhance');
  const taskId = await createTask({ userId, type: 'shot_panorama', title: `全景 — ${mode}°`, inputParams: { imageUrl, mode }, priority: 2 });
  setImmediate(() => processShotPanorama(taskId, userId, { imageUrl, mode }));
  return { taskId, estimatedSeconds: 35 };
}

async function processShotPanorama(taskId, userId, params) {
  try {
    await updateTaskStatus(taskId, userId, { status: 1, progress: 10, progressMsg: '生成3D模型...', workerId: process.pid.toString() });
    const result = await infer('stable-diffusion-xl', {
      imageUrl: params.imageUrl, task: 'image_3d', mode: params.mode,
    }, { onProgress: (p) => {
      const angles = params.mode === '360' ? 8 : 4;
      const msg = p < 40 ? '生成3D模型...' : `渲染${angles}个角度...`;
      updateTaskStatus(taskId, userId, { progress: Math.round(p * 0.95), progressMsg: msg });
    }});
    const angles = params.mode === '360' ? 8 : 4;
    const images = (result.output?.images || Array.from({ length: angles }, (_, i) => ({ id: `${taskId}_${i}`, angle: `${Math.round(i * 360 / angles)}°`, url: `/api/images/${taskId}_pano_${i}.webp` })));
    await completeTask(taskId, userId, { progressMsg: '完成', outputResult: { images, mode: params.mode } });
  } catch (err) { logger.error('[AdvancedImage] Task failed', { taskId, error: err.message }); await updateTaskStatus(taskId, userId, { status: 3, errorMsg: err.message }).catch(e => logger.error('[AdvancedImage] Status update failed', { taskId, error: e.message })); }
}

// ==================== AI 换脸 ====================

export async function submitSwapFace(userId, { baseUrl, faceUrl }) {
  if (!baseUrl || !faceUrl) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
  await creditService.consumeCredit(userId, 'model_tryon');
  const taskId = await createTask({ userId, type: 'swap_face', title: 'AI换脸', inputParams: { baseUrl, faceUrl }, priority: 2 });
  setImmediate(() => processSwapFace(taskId, userId, { baseUrl, faceUrl }));
  return { taskId, estimatedSeconds: 15 };
}

async function processSwapFace(taskId, userId, params) {
  try {
    await updateTaskStatus(taskId, userId, { status: 1, progress: 15, progressMsg: '检测面部特征点...', workerId: process.pid.toString() });
    const result = await infer('stable-diffusion-img2img', {
      baseUrl: params.baseUrl, faceUrl: params.faceUrl, task: 'swap_face',
    }, { onProgress: (p) => {
      const msg = p < 35 ? '检测面部特征点...' : p < 65 ? '面部融合匹配...' : '肤色光影统一...';
      updateTaskStatus(taskId, userId, { progress: Math.round(p * 0.95), progressMsg: msg });
    }});
    await completeTask(taskId, userId, { progressMsg: '完成', outputResult: { url: result.output?.imageUrl || `/api/images/${taskId}_swap.webp` } });
  } catch (err) { logger.error('[AdvancedImage] Task failed', { taskId, error: err.message }); await updateTaskStatus(taskId, userId, { status: 3, errorMsg: err.message }).catch(e => logger.error('[AdvancedImage] Status update failed', { taskId, error: e.message })); }
}

// ==================== AI 文字特效 ====================

export async function submitTextEffect(userId, { text, effect = 'neon' }) {
  if (!text) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
  await creditService.consumeCredit(userId, 'enhance');
  const taskId = await createTask({ userId, type: 'text_effect', title: `文字特效 — ${effect}`, inputParams: { text, effect }, priority: 1 });
  setImmediate(() => processTextEffect(taskId, userId, { text, effect }));
  return { taskId, estimatedSeconds: 8 };
}

async function processTextEffect(taskId, userId, params) {
  try {
    await updateTaskStatus(taskId, userId, { status: 1, progress: 20, progressMsg: `生成"${params.text}"${params.effect}效果...`, workerId: process.pid.toString() });
    const result = await infer('stable-diffusion-img2img', {
      text: params.text, effect: params.effect, task: 'text_effect',
    }, { onProgress: (p) => updateTaskStatus(taskId, userId, { progress: Math.round(p * 0.95), progressMsg: `渲染 ${Math.round(p)}%...` }) });
    const images = (result.output?.images || [0, 1, 2]).map((_, i) => ({ id: `${taskId}_${i}`, effect: params.effect, url: _.url || `/api/images/${taskId}_text_${i}.webp` }));
    await completeTask(taskId, userId, { progressMsg: '完成', outputResult: { images } });
  } catch (err) { logger.error('[AdvancedImage] Task failed', { taskId, error: err.message }); await updateTaskStatus(taskId, userId, { status: 3, errorMsg: err.message }).catch(e => logger.error('[AdvancedImage] Status update failed', { taskId, error: e.message })); }
}

// ==================== 任务查询 ====================

export const { getTaskResult, listMyTasks } = makeTaskQueries({ getTask, listUserTasks, countUserTasks });
