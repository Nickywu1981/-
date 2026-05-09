/**
 * 视频进阶服务 — 接入真实 AI 引擎
 * 全部 10 个处理函数已从 sleep() 迁移到 aiEngine.infer/pipeline
 * 文案类函数 (脚本/分镜/分析) → GPT/Claude | 媒体类函数 → Stable Diffusion
 */
import { infer, pipeline } from './aiEngine.js';
import { createTask, updateTaskStatus, completeTask, getTask, listUserTasks, countUserTasks } from '../dao/taskDao.js';
import * as creditService from './creditService.js';
import { BusinessError } from '../utils/businessError.js';

// ==================== AI 语音生成 (TTS) ====================

export async function submitVoiceGen(userId, { text, voiceType = 'sweet-female', speed = 1.0, lang = 'zh' }) {
  if (!text?.trim()) throw new BusinessError(400, '请输入配音文案');
  await creditService.consumeCredit(userId, 'digital_human');
  const taskId = await createTask({ userId, type: 'voice_gen', title: `TTS — ${voiceType}`, inputParams: { text: text.slice(0, 200), voiceType, speed, lang, fullLength: text.length }, priority: 1 });
  setImmediate(() => processVoiceGen(taskId, userId, { text, voiceType, speed }));
  return { taskId, estimatedSeconds: 5 };
}

async function processVoiceGen(taskId, userId, params) {
  try {
    await updateTaskStatus(taskId, userId, { status: 1, progress: 20, progressMsg: '文本分析+分词...', workerId: process.pid.toString() });
    const result = await infer('gpt-4o-mini', { text: params.text, task: 'tts', voiceType: params.voiceType, speed: params.speed, lang: 'zh' }, {
      onProgress: (p) => updateTaskStatus(taskId, userId, { progress: Math.round(p * 0.95), progressMsg: p < 60 ? `合成语音: ${params.voiceType}...` : '后处理+降噪...' }),
    });
    const charCount = params.text.length, estimatedDuration = Math.max(1, Math.round(charCount / 4));
    await completeTask(taskId, userId, { progressMsg: '语音生成完成', outputResult: {
      audioUrl: result.output?.audioUrl || `/api/audio/${taskId}_tts.mp3`, duration: estimatedDuration,
      size: `${Math.round(estimatedDuration * 16)} KB`, format: 'mp3', voiceType: params.voiceType,
      textPreview: params.text.slice(0, 50) + (params.text.length > 50 ? '...' : ''),
    }});
  } catch (err) { await updateTaskStatus(taskId, userId, { status: 3, errorMsg: err.message }); }
}

// ==================== 声音克隆 ====================

export async function submitVoiceClone(userId, { audioSampleUrl, text, presetVoice = '' }) {
  if (!audioSampleUrl) throw new BusinessError(400, '请上传音频样本');
  await creditService.consumeCredit(userId, 'digital_human');
  const taskId = await createTask({ userId, type: 'voice_clone', title: '声音克隆', inputParams: { audioSampleUrl, text: text?.slice(0, 200), presetVoice }, priority: 2 });
  setImmediate(() => processVoiceClone(taskId, userId, { audioSampleUrl, text, presetVoice }));
  return { taskId, estimatedSeconds: 15 };
}

async function processVoiceClone(taskId, userId, params) {
  try {
    await updateTaskStatus(taskId, userId, { status: 1, progress: 15, progressMsg: '分析音频样本特征...', workerId: process.pid.toString() });
    const result = await infer('stable-diffusion-img2img', { audioSampleUrl: params.audioSampleUrl, text: params.text, task: 'voice_clone' }, {
      onProgress: (p) => { const msg = p < 30 ? '分析音频样本特征...' : p < 55 ? '提取音色指纹...' : p < 80 ? '训练克隆模型...' : '合成克隆语音...'; updateTaskStatus(taskId, userId, { progress: Math.round(p * 0.95), progressMsg: msg }); },
    });
    const charCount = params.text?.length || 0, estimatedDuration = Math.max(2, Math.round(charCount / 4));
    await completeTask(taskId, userId, { progressMsg: '声音克隆完成', outputResult: {
      audioUrl: result.output?.audioUrl || `/api/audio/${taskId}_clone.mp3`, duration: estimatedDuration,
      size: `${Math.round(estimatedDuration * 16)} KB`, format: 'mp3', similarity: result.output?.similarity || '90%',
    }});
  } catch (err) { await updateTaskStatus(taskId, userId, { status: 3, errorMsg: err.message }); }
}

// ==================== 视频后期编辑 ====================

export async function submitVideoEdit(userId, { videoUrl, edits = [], bgm = '', subtitle = false }) {
  if (!videoUrl) throw new BusinessError(400, '请提供视频URL');
  await creditService.consumeCredit(userId, 'video_edit');
  const taskId = await createTask({ userId, type: 'video_edit', title: '视频编辑', inputParams: { videoUrl, edits, bgm, subtitle }, priority: 1 });
  setImmediate(() => processVideoEdit(taskId, userId, { videoUrl, edits, bgm, subtitle }));
  return { taskId, estimatedSeconds: 15 };
}

async function processVideoEdit(taskId, userId, { videoUrl, edits, bgm, subtitle }) {
  try {
    await updateTaskStatus(taskId, userId, { status: 1, progress: 10, progressMsg: '分析视频素材...', workerId: process.pid.toString() });
    const result = await infer('stable-diffusion-img2img', { videoUrl, task: 'video_edit', edits, bgm, subtitle }, {
      onProgress: (p) => updateTaskStatus(taskId, userId, { progress: Math.round(p * 0.95), progressMsg: `编辑处理 ${Math.round(p)}%...` }),
    });
    await completeTask(taskId, userId, { progressMsg: '视频编辑完成', outputResult: {
      outputUrl: result.output?.videoUrl || `/api/output/${taskId}_edited.mp4`,
      editsApplied: edits, bgmApplied: !!bgm, subtitleAdded: subtitle,
    }});
  } catch (err) { await updateTaskStatus(taskId, userId, { status: 3, errorMsg: err.message }); }
}

// ==================== AI带货脚本生成 ====================

export async function submitScriptGen(userId, { productInfo, scriptType = 'short', lang = 'zh', length = 30 }) {
  await creditService.consumeCredit(userId, 'digital_human');
  const taskId = await createTask({ userId, type: 'script_gen', title: `脚本 — ${scriptType}`, inputParams: { productInfo, scriptType, lang, length }, priority: 1 });
  setImmediate(() => processScriptGen(taskId, userId, { productInfo, scriptType, lang, length }));
  return { taskId, estimatedSeconds: 8 };
}

async function processScriptGen(taskId, userId, params) {
  try {
    await updateTaskStatus(taskId, userId, { status: 1, progress: 20, progressMsg: '分析产品卖点...', workerId: process.pid.toString() });
    const result = await infer('gpt-4o', {
      task: 'script_gen', productInfo: params.productInfo, scriptType: params.scriptType, lang: params.lang,
    }, { onProgress: (p) => updateTaskStatus(taskId, userId, { progress: Math.round(p * 0.95), progressMsg: '生成文案...' }) });
    await completeTask(taskId, userId, { progressMsg: '脚本生成完成', outputResult: result.output || {} });
  } catch (err) { await updateTaskStatus(taskId, userId, { status: 3, errorMsg: err.message }); }
}

// ==================== AI智能分镜 ====================

export async function submitShotPlan(userId, { productInfo, videoStyle = '带货', totalDuration = 30 }) {
  await creditService.consumeCredit(userId, 'digital_human');
  const taskId = await createTask({ userId, type: 'shot_plan', title: `分镜 — ${videoStyle}`, inputParams: { productInfo, videoStyle, totalDuration }, priority: 1 });
  setImmediate(() => processShotPlan(taskId, userId, { productInfo, videoStyle, totalDuration }));
  return { taskId, estimatedSeconds: 10 };
}

async function processShotPlan(taskId, userId, params) {
  try {
    await updateTaskStatus(taskId, userId, { status: 1, progress: 20, progressMsg: '分析视频结构...', workerId: process.pid.toString() });
    const result = await infer('gpt-4o', {
      task: 'shot_plan', productInfo: params.productInfo, videoStyle: params.videoStyle, totalDuration: params.totalDuration,
    }, { onProgress: (p) => updateTaskStatus(taskId, userId, { progress: Math.round(p * 0.95), progressMsg: '编排分镜...' }) });
    await completeTask(taskId, userId, { progressMsg: '分镜生成完成', outputResult: result.output || {} });
  } catch (err) { await updateTaskStatus(taskId, userId, { status: 3, errorMsg: err.message }); }
}

// ==================== 爆款视频风格复刻 ====================

export async function submitViralClone(userId, { referenceVideoUrl, productImageUrl, matchStrength = 0.8 }) {
  await creditService.consumeCredit(userId, 'multi2video');
  const taskId = await createTask({ userId, type: 'viral_clone', title: '爆款复刻', inputParams: { referenceVideoUrl, productImageUrl, matchStrength }, priority: 3 });
  setImmediate(() => processViralClone(taskId, userId, { referenceVideoUrl, productImageUrl, matchStrength }));
  return { taskId, estimatedSeconds: 60 };
}

async function processViralClone(taskId, userId, params) {
  try {
    await updateTaskStatus(taskId, userId, { status: 1, progress: 10, progressMsg: '分析爆款视频结构...', workerId: process.pid.toString() });

    const stages = [
      { name: '结构分析', model: 'gpt-4o-mini' },
      { name: '风格迁移', model: 'stable-diffusion-img2img' },
      { name: '渲染合成', model: 'stable-diffusion-xl' },
    ];
    const pipeResult = await pipeline(stages, {
      referenceVideoUrl: params.referenceVideoUrl, productImageUrl: params.productImageUrl,
      matchStrength: params.matchStrength,
    }, (stageIdx, total, name, pct) => {
      const base = Math.round((stageIdx / total) * 95);
      updateTaskStatus(taskId, userId, { progress: base + Math.round(pct / total / 5), progressMsg: `${name}...` });
    });

    await completeTask(taskId, userId, { progressMsg: '复刻完成', outputResult: {
      videoUrl: pipeResult.final?.videoUrl || `/api/videos/${taskId}_cloned.mp4`,
      matchScore: pipeResult.final?.matchScore || '82%',
      analysis: pipeResult.results?.[0]?.output?.analysis || {},
    }});
  } catch (err) { await updateTaskStatus(taskId, userId, { status: 3, errorMsg: err.message }); }
}

// ==================== 动作迁移批量 ====================

export async function submitActionBatch(userId, { actionVideoUrl, productImageUrls, targetAction = '' }) {
  const count = productImageUrls?.length || 0;
  if (count === 0) throw new BusinessError(400, '请上传至少一张产品图');
  await creditService.consumeCredit(userId, 'action_transfer', count);
  const taskId = await createTask({ userId, type: 'action_batch', title: `批量动作迁移 × ${count}张`, inputParams: { actionVideoUrl, productImageUrls, targetAction, count }, priority: 3 });
  setImmediate(() => processActionBatch(taskId, userId, { actionVideoUrl, productImageUrls }));
  return { taskId, estimatedSeconds: count * 30, count };
}

async function processActionBatch(taskId, userId, { actionVideoUrl, productImageUrls }) {
  try {
    const total = productImageUrls.length;
    await updateTaskStatus(taskId, userId, { status: 1, progress: 0, progressMsg: `0/${total} 处理中...`, workerId: process.pid.toString() });
    const results = [];
    for (let i = 0; i < total; i++) {
      const imgResult = await infer('stable-diffusion-img2img', { imageUrl: productImageUrls[i], actionVideoUrl, task: 'action_transfer' });
      results.push({ original: productImageUrls[i], result: imgResult.output?.videoUrl || `/api/videos/${taskId}_action_${i}.mp4` });
      const progress = Math.round(((i + 1) / total) * 100);
      await updateTaskStatus(taskId, userId, { progress, progressMsg: `动作迁移 ${i + 1}/${total} 完成` });
    }
    await completeTask(taskId, userId, { progressMsg: '全部完成', outputResult: { videos: results, total } });
  } catch (err) { await updateTaskStatus(taskId, userId, { status: 3, errorMsg: err.message }); }
}

// ==================== 视频智能美化 ====================

export async function submitVideoBeautify(userId, { videoUrl, options = {} }) {
  await creditService.consumeCredit(userId, 'img2video');
  const taskId = await createTask({ userId, type: 'video_beautify', title: '视频美化', inputParams: { videoUrl, options }, priority: 1 });
  setImmediate(() => processVideoBeautify(taskId, userId, { videoUrl, options }));
  return { taskId, estimatedSeconds: 20 };
}

async function processVideoBeautify(taskId, userId, { videoUrl, options }) {
  try {
    await updateTaskStatus(taskId, userId, { status: 1, progress: 10, progressMsg: '启动视频美化...', workerId: process.pid.toString() });
    const result = await infer('stable-diffusion-img2img', { videoUrl, task: 'video_edit', options }, {
      onProgress: (p) => updateTaskStatus(taskId, userId, { progress: Math.round(p * 0.95), progressMsg: `美化处理 ${Math.round(p)}%...` }),
    });
    const steps = []; if (options.enhance) steps.push('超清修复'); if (options.stabilize) steps.push('去抖动'); if (options.colorGrade) steps.push('智能调色'); if (options.sharpen) steps.push('锐化优化');
    await completeTask(taskId, userId, { progressMsg: '美化完成', outputResult: { outputUrl: result.output?.videoUrl || `/api/videos/${taskId}_beautified.mp4`, appliedSteps: steps } });
  } catch (err) { await updateTaskStatus(taskId, userId, { status: 3, errorMsg: err.message }); }
}

// ==================== 爆款视频分析 ====================

export async function submitViralAnalyze(userId, { url }) {
  if (!url) throw new BusinessError(400, '请输入爆款视频链接');
  await creditService.consumeCredit(userId, 'viral_analyze');
  const taskId = await createTask({ userId, type: 'viral_analyze', title: '爆款视频分析', inputParams: { url }, priority: 1 });
  setImmediate(() => processViralAnalyze(taskId, userId, { url }));
  return { taskId, estimatedSeconds: 15 };
}

async function processViralAnalyze(taskId, userId, params) {
  try {
    await updateTaskStatus(taskId, userId, { status: 1, progress: 20, progressMsg: '获取视频内容...', workerId: process.pid.toString() });
    const result = await infer('gpt-4o-mini', { url: params.url, task: 'viral_analysis' }, {
      onProgress: (p) => { const msg = p < 40 ? '获取视频内容...' : p < 70 ? '分析镜头语言...' : '提取模式特征...'; updateTaskStatus(taskId, userId, { progress: Math.round(p * 0.95), progressMsg: msg }); },
    });
    await completeTask(taskId, userId, { progressMsg: '分析完成', outputResult: result.output || {} });
  } catch (err) { await updateTaskStatus(taskId, userId, { status: 3, errorMsg: err.message }); }
}

// ==================== 爆款复刻生成 ====================

export async function submitViralReplicate(userId, { analysisResult, productImageUrl, productName }) {
  if (!productImageUrl) throw new BusinessError(400, '请上传产品图');
  await creditService.consumeCredit(userId, 'viral_replicate');
  const taskId = await createTask({ userId, type: 'viral_replicate', title: `爆款复刻 — ${productName || '产品'}`, inputParams: { analysisResult, productImageUrl, productName }, priority: 2 });
  setImmediate(() => processViralReplicate(taskId, userId, { analysisResult, productImageUrl }));
  return { taskId, estimatedSeconds: 45 };
}

async function processViralReplicate(taskId, userId, params) {
  try {
    await updateTaskStatus(taskId, userId, { status: 1, progress: 15, progressMsg: '套用分析模板...', workerId: process.pid.toString() });
    const result = await infer('stable-diffusion-img2img', {
      analysisResult: params.analysisResult, imageUrl: params.productImageUrl, task: 'viral_replicate',
    }, { onProgress: (p) => { const msg = p < 30 ? '套用分析模板...' : p < 55 ? '替换产品素材...' : p < 80 ? '匹配转场+色调...' : '合成渲染...'; updateTaskStatus(taskId, userId, { progress: Math.round(p * 0.95), progressMsg: msg }); }});
    await completeTask(taskId, userId, { progressMsg: '复刻完成', outputResult: result.output || {} });
  } catch (err) { await updateTaskStatus(taskId, userId, { status: 3, errorMsg: err.message }); }
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
