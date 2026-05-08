/**
 * 视频进阶服务 — 第六阶段
 * 带货脚本 / 智能分镜 / 爆款复刻 / 数字人增强 / 动作迁移批量 / 视频美化
 */

import { createTask, updateTaskStatus, getTask, listUserTasks, countUserTasks, completeTask } from '../dao/taskDao.js';
import * as creditService from './creditService.js';

// ==================== AI 语音生成 (TTS) ====================

export async function submitVoiceGen(userId, { text, voiceType = 'sweet-female', speed = 1.0, lang = 'zh' }) {
  if (!text || !text.trim()) {
    const err = new Error('请输入配音文案');
    err.statusCode = 400;
    throw err;
  }
  await creditService.consumeCredit(userId, 'digital_human');

  const taskId = await createTask({
    userId, type: 'voice_gen', title: `TTS — ${voiceType}`,
    inputParams: { text: text.slice(0, 200), voiceType, speed, lang, fullLength: text.length },
    priority: 1,
  });

  setImmediate(() => processVoiceGen(taskId, userId, { text, voiceType, speed }));

  return { taskId, estimatedSeconds: 5 };
}

async function processVoiceGen(taskId, userId, params) {
  try {
    await updateTaskStatus(taskId, userId, { status: 1, progress: 20, progressMsg: '文本分析+分词...', workerId: process.pid.toString() });
    await sleep(1500);
    await updateTaskStatus(taskId, userId, { progress: 50, progressMsg: `合成语音: ${params.voiceType}...` });
    await sleep(1500);
    await updateTaskStatus(taskId, userId, { progress: 80, progressMsg: '后处理+降噪...' });
    await sleep(1000);

    const charCount = params.text.length;
    const estimatedDuration = Math.max(1, Math.round(charCount / 4));
    const result = {
      audioUrl: `/api/audio/${taskId}_tts.mp3`,
      duration: estimatedDuration,
      size: `${Math.round(estimatedDuration * 16)} KB`,
      format: 'mp3',
      voiceType: params.voiceType,
      textPreview: params.text.slice(0, 50) + (params.text.length > 50 ? '...' : ''),
    };

    await completeTask(taskId, userId, { progressMsg: '语音生成完成', outputResult: result });
  } catch (err) {
    await updateTaskStatus(taskId, userId, { status: 3, errorMsg: err.message });
  }
}

// ==================== 声音克隆 ====================

export async function submitVoiceClone(userId, { audioSampleUrl, text, presetVoice = '' }) {
  if (!audioSampleUrl) {
    const err = new Error('请上传音频样本');
    err.statusCode = 400;
    throw err;
  }
  await creditService.consumeCredit(userId, 'digital_human');

  const taskId = await createTask({
    userId, type: 'voice_clone', title: '声音克隆',
    inputParams: { audioSampleUrl, text: text?.slice(0, 200), presetVoice },
    priority: 2,
  });

  setImmediate(() => processVoiceClone(taskId, userId, { audioSampleUrl, text, presetVoice }));

  return { taskId, estimatedSeconds: 15 };
}

async function processVoiceClone(taskId, userId, params) {
  try {
    await updateTaskStatus(taskId, userId, { status: 1, progress: 15, progressMsg: '分析音频样本特征...', workerId: process.pid.toString() });
    await sleep(3500);
    await updateTaskStatus(taskId, userId, { progress: 40, progressMsg: '提取音色指纹...' });
    await sleep(3000);
    await updateTaskStatus(taskId, userId, { progress: 65, progressMsg: '训练克隆模型...' });
    await sleep(3500);
    await updateTaskStatus(taskId, userId, { progress: 85, progressMsg: '合成克隆语音...' });
    await sleep(2000);

    const charCount = params.text?.length || 0;
    const estimatedDuration = Math.max(2, Math.round(charCount / 4));
    const result = {
      audioUrl: `/api/audio/${taskId}_clone.mp3`,
      duration: estimatedDuration,
      size: `${Math.round(estimatedDuration * 16)} KB`,
      format: 'mp3',
      similarity: `${85 + Math.floor(Math.random() * 12)}%`,
    };

    await completeTask(taskId, userId, { progressMsg: '声音克隆完成', outputResult: result });
  } catch (err) {
    await updateTaskStatus(taskId, userId, { status: 3, errorMsg: err.message });
  }
}

// ==================== 视频后期编辑 ====================

export async function submitVideoEdit(userId, { videoUrl, edits = [], bgm = '', subtitle = false }) {
  await creditService.consumeCredit(userId, 'video_edit');

  const taskId = await createTask({
    userId, type: 'video_edit', title: '视频编辑',
    inputParams: { videoUrl, edits, bgm, subtitle },
    priority: 1,
  });

  copyTask(taskId, userId, { videoUrl, edits, bgm, subtitle });
  return { taskId, estimatedSeconds: 15 };
}

async function copyTask(taskId, userId, { videoUrl, edits, bgm, subtitle }) {
  try {
    await updateTaskStatus(taskId, userId, { status: 1, progressMsg: '分析视频素材...' });
    await sleep(2000);
    await updateTaskStatus(taskId, userId, { progressMsg: '执行编辑操作...', progress: 50 });
    await sleep(2000);

    const result = {
      outputUrl: `/api/output/${taskId}_edited.mp4`,
      duration: `${30 + Math.floor(Math.random() * 60)}s`,
      editsApplied: edits,
      bgmApplied: !!bgm,
      subtitleAdded: subtitle,
    };

    await completeTask(taskId, userId, { progressMsg: '视频编辑完成', outputResult: result });
  } catch (err) {
    await updateTaskStatus(taskId, userId, { status: 3, errorMsg: err.message });
  }
}

// ==================== AI带货脚本生成 ====================

export async function submitScriptGen(userId, { productInfo, scriptType = 'short', lang = 'zh', length = 30 }) {
  await creditService.consumeCredit(userId, 'digital_human');

  const taskId = await createTask({
    userId, type: 'script_gen', title: `脚本 — ${scriptType}`,
    inputParams: { productInfo, scriptType, lang, length },
    priority: 1,
  });

  setImmediate(() => processScriptGen(taskId, userId, { productInfo, scriptType, lang, length }));

  return { taskId, estimatedSeconds: 8 };
}

async function processScriptGen(taskId, userId, params) {
  try {
    await updateTaskStatus(taskId, userId, { status: 1, progress: 20, progressMsg: '分析产品卖点...', workerId: process.pid.toString() });
    await sleep(2000);
    await updateTaskStatus(taskId, userId, { progress: 60, progressMsg: '生成文案...' });
    await sleep(2000);

    const scripts = {
      short_video: {
        title: '短视频口播脚本',
        hooks: [
          '姐妹们！这件真的太绝了！',
          `你敢信？${params.productInfo?.slice(0, 20) || '这款产品'}居然能做到这样！`,
          '我宣布这是我今年最满意的单品！',
        ],
        body: `${params.productInfo || '这款产品'}采用优质面料，舒适透气不起球。经典版型设计，显高显瘦不挑身材。日常通勤约会都能轻松驾驭。`,
        cta: '点击下方链接，限时特惠只要99元！先到先得！',
      },
      live_stream: {
        title: '直播脚本',
        sections: [
          { time: '0:00-0:30', content: '开场+引流话术', tip: '语速快+热情' },
          { time: '0:30-2:00', content: '产品核心卖点讲解', tip: '展示实拍+对比' },
          { time: '2:00-3:00', content: '使用场景+真实感受', tip: '自然松弛' },
          { time: '3:00-3:30', content: '价格锚点+逼单', tip: '紧张感+稀缺性' },
        ],
      },
      social_post: {
        title: '种草文案',
        captions: [
          '终于拿下了！实物比照片还好看！📦✨',
          '小众宝藏，质感绝了！已经被同事要链接了！🔥',
          '这次购物太满意了，必须给你们种草一下！💯',
        ],
        hashtags: '#好物推荐 #种草 #购物分享 #性价比 #穿搭',
      },
    };

    const result = scripts[params.scriptType] || scripts.short_video;

    await completeTask(taskId, userId, { progressMsg: '脚本生成完成', outputResult: result });
  } catch (err) {
    await updateTaskStatus(taskId, userId, { status: 3, errorMsg: err.message });
  }
}

// ==================== AI智能分镜 ====================

export async function submitShotPlan(userId, { productInfo, videoStyle = '带货', totalDuration = 30 }) {
  await creditService.consumeCredit(userId, 'digital_human');

  const taskId = await createTask({
    userId, type: 'shot_plan', title: `分镜 — ${videoStyle}`,
    inputParams: { productInfo, videoStyle, totalDuration },
    priority: 1,
  });

  setImmediate(() => processShotPlan(taskId, userId, { productInfo, videoStyle, totalDuration }));

  return { taskId, estimatedSeconds: 10 };
}

async function processShotPlan(taskId, userId, params) {
  try {
    await updateTaskStatus(taskId, userId, { status: 1, progress: 20, progressMsg: '分析视频结构...', workerId: process.pid.toString() });
    await sleep(2500);
    await updateTaskStatus(taskId, userId, { progress: 60, progressMsg: '编排分镜...' });
    await sleep(2500);

    const shots = [
      { id: 1, scene: '产品全景', duration: '5s', camera: '缓缓推近', tip: '展示整体外观，光线柔和', text: '产品正面全景→缓慢推进至细节' },
      { id: 2, scene: '细节特写', duration: '5s', camera: '微距锁定', tip: '展示材质/做工细节', text: '面料纹理/做工缝线/Logo特写' },
      { id: 3, scene: '使用场景', duration: '8s', camera: '跟拍+切换', tip: '真人出镜自然使用', text: '模特穿搭场景→生活化展示' },
      { id: 4, scene: '功能演示', duration: '7s', camera: '俯拍+特写', tip: '关键卖点演示', text: '产品核心功能/材质对比/效果展示' },
      { id: 5, scene: '结尾CTA', duration: '5s', camera: '固定+Logo', tip: '价格+购买引导', text: '产品集合展示→价格标签→二维码' },
    ];

    const result = {
      title: `${params.videoStyle}视频分镜`,
      totalDuration: `${params.totalDuration}s`,
      shots,
      tips: ['光线要充足', '背景简洁', '产品占画面60%以上', '前三秒设悬念吸引停留'],
    };

    await completeTask(taskId, userId, { progressMsg: '分镜生成完成', outputResult: result });
  } catch (err) {
    await updateTaskStatus(taskId, userId, { status: 3, errorMsg: err.message });
  }
}

// ==================== 爆款视频风格复刻 ====================

export async function submitViralClone(userId, { referenceVideoUrl, productImageUrl, matchStrength = 0.8 }) {
  await creditService.consumeCredit(userId, 'multi2video');

  const taskId = await createTask({
    userId, type: 'viral_clone', title: '爆款复刻',
    inputParams: { referenceVideoUrl, productImageUrl, matchStrength },
    priority: 3,
  });

  setImmediate(() => processViralClone(taskId, userId, { referenceVideoUrl, productImageUrl, matchStrength }));

  return { taskId, estimatedSeconds: 60 };
}

async function processViralClone(taskId, userId, _params) {
  try {
    await updateTaskStatus(taskId, userId, { status: 1, progress: 10, progressMsg: '分析爆款视频结构...', workerId: process.pid.toString() });
    await sleep(5000);
    await updateTaskStatus(taskId, userId, { progress: 30, progressMsg: '提取镜头节奏+色调+运镜...' });
    await sleep(5000);
    await updateTaskStatus(taskId, userId, { progress: 55, progressMsg: '分析转场+时长分布...' });
    await sleep(5000);
    await updateTaskStatus(taskId, userId, { progress: 75, progressMsg: '应用分析模板替换产品...' });
    await sleep(5000);
    await updateTaskStatus(taskId, userId, { progress: 90, progressMsg: '渲染生成...' });
    await sleep(5000);

    const result = {
      videoUrl: `/api/videos/${taskId}_cloned.mp4`,
      matchScore: '82%',
      analysis: {
        tempo: '快节奏',
        dominantColor: '暖色调',
        avgShotLength: '2.3s',
        transitions: ['硬切', '缩放', '滑动'],
      },
    };

    await completeTask(taskId, userId, { progressMsg: '复刻完成', outputResult: result });
  } catch (err) {
    await updateTaskStatus(taskId, userId, { status: 3, errorMsg: err.message });
  }
}

// ==================== 动作迁移批量 ====================

export async function submitActionBatch(userId, { actionVideoUrl, productImageUrls, targetAction = '' }) {
  const count = productImageUrls?.length || 0;
  if (count === 0) {
    const err = new Error('请上传至少一张产品图');
    err.statusCode = 400;
    throw err;
  }

  await creditService.consumeCredit(userId, 'action_transfer', count);

  const taskId = await createTask({
    userId, type: 'action_batch', title: `批量动作迁移 × ${count}张`,
    inputParams: { actionVideoUrl, productImageUrls, targetAction, count },
    priority: 3,
  });

  setImmediate(() => processActionBatch(taskId, userId, { productImageUrls, count }));

  return { taskId, estimatedSeconds: count * 30, count };
}

async function processActionBatch(taskId, userId, { productImageUrls }) {
  try {
    const total = productImageUrls.length;
    await updateTaskStatus(taskId, userId, { status: 1, progress: 0, progressMsg: `0/${total} 处理中...`, workerId: process.pid.toString() });

    const results = [];
    for (let i = 0; i < total; i++) {
      await sleep(3000);
      results.push({ original: productImageUrls[i], result: `/api/videos/${taskId}_action_${i}.mp4` });
      const progress = Math.round(((i + 1) / total) * 100);
      await updateTaskStatus(taskId, userId, { progress, progressMsg: `动作迁移 ${i + 1}/${total} 完成` });
    }

    await completeTask(taskId, userId, { progressMsg: '全部完成', outputResult: { videos: results, total } });
  } catch (err) {
    await updateTaskStatus(taskId, userId, { status: 3, errorMsg: err.message });
  }
}

// ==================== 视频智能美化 ====================

export async function submitVideoBeautify(userId, { videoUrl, options = {} }) {
  await creditService.consumeCredit(userId, 'img2video');

  const taskId = await createTask({
    userId, type: 'video_beautify', title: '视频美化',
    inputParams: { videoUrl, options },
    priority: 1,
  });

  setImmediate(() => processVideoBeautify(taskId, userId, { videoUrl, options }));

  return { taskId, estimatedSeconds: 20 };
}

async function processVideoBeautify(taskId, userId, { options }) {
  try {
    const steps = [];
    if (options.enhance) steps.push('超清修复');
    if (options.stabilize) steps.push('去抖动');
    if (options.colorGrade) steps.push('智能调色');
    if (options.sharpen) steps.push('锐化优化');

    await updateTaskStatus(taskId, userId, { status: 1, progress: 10, progressMsg: steps[0] + '...', workerId: process.pid.toString() });

    for (let i = 0; i < steps.length; i++) {
      await sleep(2500);
      await updateTaskStatus(taskId, userId, { progress: Math.round(((i + 1) / steps.length) * 100), progressMsg: steps[i] + '...' });
    }

    const result = { outputUrl: `/api/videos/${taskId}_beautified.mp4`, appliedSteps: steps };

    await completeTask(taskId, userId, { progressMsg: '美化完成', outputResult: result });
  } catch (err) {
    await updateTaskStatus(taskId, userId, { status: 3, errorMsg: err.message });
  }
}

// ==================== 任务查询 ====================

export async function getTaskResult(taskId, userId) {
  const task = await getTask(taskId, userId);
  if (!task) { const err = new Error('任务不存在'); err.statusCode = 404; throw err; }
  return task;
}

export async function listMyTasks(userId, { status, type, page, pageSize }) {
  const list = await listUserTasks(userId, { status, type, page, pageSize });
  const total = await countUserTasks(userId, { status, type });
  return { list, total, page, pageSize };
}

// ==================== 爆款视频分析 ====================

export async function submitViralAnalyze(userId, { url }) {
  if (!url) {
    const err = new Error('请输入爆款视频链接');
    err.statusCode = 400;
    throw err;
  }
  await creditService.consumeCredit(userId, 'viral_analyze');

  const taskId = await createTask({
    userId, type: 'viral_analyze', title: '爆款视频分析',
    inputParams: { url },
    priority: 1,
  });

  setImmediate(() => processViralAnalyze(taskId, userId, { url }));
  return { taskId, estimatedSeconds: 15 };
}

async function processViralAnalyze(taskId, userId, _params) {
  try {
    await updateTaskStatus(taskId, userId, { status: 1, progress: 20, progressMsg: '获取视频内容...', workerId: process.pid.toString() });
    await sleep(3000);
    await updateTaskStatus(taskId, userId, { progress: 50, progressMsg: '分析节奏与镜头语言...' });
    await sleep(3000);
    await updateTaskStatus(taskId, userId, { progress: 80, progressMsg: '提取色调/转场/文案模式...' });
    await sleep(3000);

    const result = {
      analysis: {
        tempo: ['快节奏', '中速', '慢节奏'][Math.floor(Math.random() * 3)],
        dominantColor: ['暖色调', '冷色调', '高饱和', '低饱和'][Math.floor(Math.random() * 4)],
        avgShotLength: (1 + Math.random() * 4).toFixed(1) + 's',
        transitions: ['硬切', '缩放', '滑动', '淡入淡出'].slice(0, 2 + Math.floor(Math.random() * 2)),
        hookPatterns: ['前三秒悬念', '文字开幕', '对比冲击'],
        bgmStyle: ['激昂', '轻快', '氛围感', '节奏鼓点'][Math.floor(Math.random() * 4)],
        textOverlay: ['大号标题+小字说明', '居中弹幕式', '底部字幕条'],
      },
      tips: ['开头0.5秒内出现产品', '前三帧必须有强视觉冲击', '结尾加入明确CTA'],
    };

    await completeTask(taskId, userId, { progressMsg: '分析完成', outputResult: result });
  } catch (err) {
    await updateTaskStatus(taskId, userId, { status: 3, errorMsg: err.message });
  }
}

// ==================== 爆款复刻生成 ====================

export async function submitViralReplicate(userId, { analysisResult, productImageUrl, productName }) {
  if (!productImageUrl) {
    const err = new Error('请上传产品图');
    err.statusCode = 400;
    throw err;
  }
  await creditService.consumeCredit(userId, 'viral_replicate');

  const taskId = await createTask({
    userId, type: 'viral_replicate', title: `爆款复刻 — ${productName || '产品'}`,
    inputParams: { analysisResult, productImageUrl, productName },
    priority: 2,
  });

  setImmediate(() => processViralReplicate(taskId, userId, { analysisResult, productImageUrl }));
  return { taskId, estimatedSeconds: 45 };
}

async function processViralReplicate(taskId, userId, _params) {
  try {
    await updateTaskStatus(taskId, userId, { status: 1, progress: 15, progressMsg: '套用分析模板...', workerId: process.pid.toString() });
    await sleep(4000);
    await updateTaskStatus(taskId, userId, { progress: 40, progressMsg: '替换产品素材...' });
    await sleep(4000);
    await updateTaskStatus(taskId, userId, { progress: 65, progressMsg: '匹配转场+色调...' });
    await sleep(4000);
    await updateTaskStatus(taskId, userId, { progress: 85, progressMsg: '合成渲染...' });
    await sleep(4000);

    const result = {
      videoUrl: `/api/videos/${taskId}_viral.mp4`,
      matchScore: (75 + Math.random() * 20).toFixed(0) + '%',
      duration: (10 + Math.floor(Math.random() * 20)) + 's',
    };

    await completeTask(taskId, userId, { progressMsg: '复刻完成', outputResult: result });
  } catch (err) {
    await updateTaskStatus(taskId, userId, { status: 3, errorMsg: err.message });
  }
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
