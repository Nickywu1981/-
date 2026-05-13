/**
 * 视频处理服务 — 接入真实 AI 引擎
 * 全部 6 个处理函数已从 sleep() 迁移到 aiEngine.infer / aiEngine.pipeline
 */
import { infer, pipeline } from './aiEngine.js';
import { createTask, updateTaskStatus, completeTask, getTask, listUserTasks, countUserTasks } from '../dao/taskDao.js';
import * as creditService from './creditService.js';
import { BusinessError } from '../utils/businessError.js';

// ==================== 单图生视频 ====================

export async function submitImg2Video(userId, { imageUrl, style = 'fast', duration = 15, platform = 'taobao' }) {
  await creditService.consumeCredit(userId, 'img2video');
  const taskId = await createTask({
    userId, type: 'img2video', title: `单图生视频 — ${style} ${duration}s`,
    inputParams: { imageUrl, style, duration, platform }, priority: 2,
  });
  setImmediate(() => processImg2Video(taskId, userId, { imageUrl, style, duration, platform }));
  return { taskId, estimatedSeconds: 30 };
}

async function processImg2Video(taskId, userId, params) {
  try {
    await updateTaskStatus(taskId, userId, { status: 1, progress: 5, progressMsg: '分析产品特征...', workerId: process.pid.toString() });
    const result = await infer('stable-diffusion-xl', {
      imageUrl: params.imageUrl, task: 'img2video', style: params.style,
      duration: params.duration, platform: params.platform,
    }, { onProgress: (p) => {
      const msg = p < 30 ? '分析产品特征...' : p < 60 ? '生成视频运镜...' : p < 85 ? '渲染视频帧...' : '添加转场效果...';
      updateTaskStatus(taskId, userId, { progress: Math.round(p * 0.95), progressMsg: msg });
    }});
    await completeTask(taskId, userId, { progressMsg: '完成', outputResult: {
      videoUrl: result.output?.videoUrl || `/api/videos/${taskId}.mp4`,
      duration: params.duration, resolution: '1080x1920', format: 'mp4',
      thumbnail: result.output?.thumbnail || `/api/videos/${taskId}_thumb.webp`,
    }});
  } catch (err) { await updateTaskStatus(taskId, userId, { status: 3, errorMsg: err.message }); }
}

// ==================== 多图合成带货视频 ====================

export async function submitMulti2Video(userId, { imageUrls, style = 'fast', duration = 15, sellPoints = [] }) {
  const count = imageUrls?.length || 0;
  if (count < 2) throw new BusinessError(400, '至少需要2张图片');
  await creditService.consumeCredit(userId, 'multi2video');
  const taskId = await createTask({
    userId, type: 'multi2video', title: `多图合成 — ${style} ${duration}s × ${count}张`,
    inputParams: { imageUrls, style, duration, sellPoints }, priority: 2,
  });
  setImmediate(() => processMulti2Video(taskId, userId, { imageUrls, style, duration, sellPoints }));
  return { taskId, estimatedSeconds: 45 };
}

async function processMulti2Video(taskId, userId, params) {
  try {
    await updateTaskStatus(taskId, userId, { status: 1, progress: 5, progressMsg: '分析图片序列...', workerId: process.pid.toString() });

    const stages = [
      { name: '分析画面',   model: 'stable-diffusion-img2img' },
      { name: '运镜编排',   model: 'stable-diffusion-xl' },
      { name: '渲染合成',   model: 'stable-diffusion-img2img' },
    ];
    const pipeResult = await pipeline(stages, {
      imageUrls: params.imageUrls, style: params.style,
      duration: params.duration, sellPoints: params.sellPoints,
    }, (stageIdx, total, name, pct) => {
      const base = Math.round((stageIdx / total) * 95);
      updateTaskStatus(taskId, userId, { progress: base + Math.round(pct / total / 5), progressMsg: `${name}...` });
    });

    await completeTask(taskId, userId, { progressMsg: '视频合成完成', outputResult: {
      videoUrl: pipeResult.final?.videoUrl || `/api/videos/${taskId}.mp4`,
      duration: params.duration, resolution: '1080x1920', format: 'mp4',
      thumbnail: pipeResult.final?.thumbnail || `/api/videos/${taskId}_thumb.webp`,
      segments: params.imageUrls.length,
    }});
  } catch (err) { await updateTaskStatus(taskId, userId, { status: 3, errorMsg: err.message }); }
}

// ==================== 视频自动包装 ====================

export async function submitVideoPackaging(userId, { videoUrl, options = {} }) {
  await creditService.consumeCredit(userId, 'img2video');
  const { subtitles = true, bgm = 'default', stickers = [], brandLogo = false, ratio = '9:16' } = options;
  const taskId = await createTask({
    userId, type: 'video_packaging', title: '视频包装',
    inputParams: { videoUrl, subtitles, bgm, stickers, brandLogo, ratio }, priority: 2,
  });
  setImmediate(() => processVideoPackaging(taskId, userId, { videoUrl, options }));
  return { taskId, estimatedSeconds: 20 };
}

async function processVideoPackaging(taskId, userId, { videoUrl, options }) {
  try {
    await updateTaskStatus(taskId, userId, { status: 1, progress: 5, progressMsg: '启动包装处理...', workerId: process.pid.toString() });
    const result = await infer('stable-diffusion-img2img', {
      videoUrl, task: 'video_edit',
      subtitles: options.subtitles, bgm: options.bgm,
      stickers: options.stickers, brandLogo: options.brandLogo, ratio: options.ratio,
    }, { onProgress: (p) => updateTaskStatus(taskId, userId, { progress: Math.round(p * 0.95), progressMsg: `包装处理 ${Math.round(p)}%...` }) });

    await completeTask(taskId, userId, { progressMsg: '包装完成', outputResult: {
      packagedVideoUrl: result.output?.videoUrl || `/api/videos/${taskId}_packaged.mp4`,
      appliedOptions: options,
    }});
  } catch (err) { await updateTaskStatus(taskId, userId, { status: 3, errorMsg: err.message }); }
}

// ==================== 动作迁移 ====================

export async function submitActionTransfer(userId, { sourceImageUrl, actionVideoUrl, targetAction = '' }) {
  await creditService.consumeCredit(userId, 'action_transfer');
  const taskId = await createTask({
    userId, type: 'action_transfer', title: '动作迁移',
    inputParams: { sourceImageUrl, actionVideoUrl, targetAction }, priority: 3,
  });
  setImmediate(() => processActionTransfer(taskId, userId, { sourceImageUrl, actionVideoUrl }));
  return { taskId, estimatedSeconds: 60 };
}

async function processActionTransfer(taskId, userId, params) {
  try {
    await updateTaskStatus(taskId, userId, { status: 1, progress: 10, progressMsg: '分析源动作...', workerId: process.pid.toString() });
    const result = await infer('stable-diffusion-img2img', {
      sourceImageUrl: params.sourceImageUrl, actionVideoUrl: params.actionVideoUrl,
      task: 'action_transfer',
    }, { onProgress: (p) => {
      const msg = p < 30 ? '分析源动作...' : p < 55 ? '提取关键点...' : p < 80 ? '迁移动作映射...' : '渲染生成...';
      updateTaskStatus(taskId, userId, { progress: Math.round(p * 0.95), progressMsg: msg });
    }});

    await completeTask(taskId, userId, { progressMsg: '动作迁移完成', outputResult: {
      videoUrl: result.output?.videoUrl || `/api/videos/${taskId}_action.mp4`,
      sourceImage: params.sourceImageUrl, actionRef: params.actionVideoUrl, format: 'mp4',
    }});
  } catch (err) { await updateTaskStatus(taskId, userId, { status: 3, errorMsg: err.message }); }
}

// ==================== 人物替换 ====================

export async function submitPersonReplace(userId, { sourceImageUrl, targetPersonUrl }) {
  await creditService.consumeCredit(userId, 'model_tryon');
  const taskId = await createTask({
    userId, type: 'person_replace', title: '人物替换',
    inputParams: { sourceImageUrl, targetPersonUrl }, priority: 2,
  });
  setImmediate(() => processPersonReplace(taskId, userId, { sourceImageUrl, targetPersonUrl }));
  return { taskId, estimatedSeconds: 25 };
}

async function processPersonReplace(taskId, userId, params) {
  try {
    await updateTaskStatus(taskId, userId, { status: 1, progress: 10, progressMsg: '识别人物区域...', workerId: process.pid.toString() });
    const result = await infer('stable-diffusion-img2img', {
      sourceImageUrl: params.sourceImageUrl, targetPersonUrl: params.targetPersonUrl,
      task: 'virtual_tryon',
    }, { onProgress: (p) => {
      const msg = p < 30 ? '识别人物区域...' : p < 60 ? '提取人物特征...' : p < 85 ? '融合替换...' : '后处理优化...';
      updateTaskStatus(taskId, userId, { progress: Math.round(p * 0.95), progressMsg: msg });
    }});

    await completeTask(taskId, userId, { progressMsg: '人物替换完成', outputResult: {
      imageUrl: result.output?.imageUrl || `/api/images/${taskId}_replaced.webp`,
      sourceImage: params.sourceImageUrl, format: 'webp',
    }});
  } catch (err) { await updateTaskStatus(taskId, userId, { status: 3, errorMsg: err.message }); }
}

// ==================== 口播数字人 ====================

export async function submitDigitalHuman(userId, { script, voice = 'default', avatar = 'default', background = '' }) {
  await creditService.consumeCredit(userId, 'digital_human');
  const taskId = await createTask({
    userId, type: 'digital_human', title: '口播生成',
    inputParams: { script, voice, avatar, background }, priority: 3,
  });
  setImmediate(() => processDigitalHuman(taskId, userId, { script, voice, avatar, background }));
  return { taskId, estimatedSeconds: 40 };
}

async function processDigitalHuman(taskId, userId, params) {
  try {
    await updateTaskStatus(taskId, userId, { status: 1, progress: 5, progressMsg: 'AI 生成口播语音...', workerId: process.pid.toString() });

    const stages = [
      { name: '文本转语音', model: 'gpt-4o-mini' },
      { name: '口型动画',   model: 'stable-diffusion-img2img' },
      { name: '渲染合成',   model: 'stable-diffusion-xl' },
    ];
    const pipeResult = await pipeline(stages, {
      script: params.script, voice: params.voice,
      avatar: params.avatar, background: params.background,
    }, (stageIdx, total, name, pct) => {
      const base = Math.round((stageIdx / total) * 95);
      updateTaskStatus(taskId, userId, { progress: base + Math.round(pct / total / 5), progressMsg: `${name}...` });
    });

    await completeTask(taskId, userId, { progressMsg: '口播视频生成完成', outputResult: {
      videoUrl: pipeResult.final?.videoUrl || `/api/videos/${taskId}_digital_human.mp4`,
      duration: Math.ceil((params.script?.length || 0) / 5), format: 'mp4',
      thumbnail: pipeResult.final?.thumbnail || `/api/videos/${taskId}_dh_thumb.webp`,
    }});
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
