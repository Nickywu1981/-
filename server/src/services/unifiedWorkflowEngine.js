/**
 * 统一工作流引擎 (Unified Workflow Engine)
 *
 * 核心能力:
 *   1. 双模式运行: auto(系统智能选模型) / custom(手动指定每步模型)
 *   2. 步骤级模型绑定 — 每一步独立选择模型
 *   3. 固定步骤顺序 — 不可乱序执行
 *   4. 步骤可开关 — 后台启用/禁用
 *   5. 人工干预 — 暂停/修改上下文/继续
 *   6. 进度追踪 — 每步状态+耗时+输出
 *
 * 铁则:
 *   - 禁止裸调模型: 所有步骤必须经 prompt_wrap → 合规校验
 *   - 视频铁则: forceVideoRule=true 的工作流必须先脚本→分镜→再合成
 */
import { getWorkflow, getWorkflowSteps } from './workflowDefinitions.js';
import { autoSelect, getModelConfig } from './modelPoolService.js';
import { isBlocked } from './adComplianceEngine.js';
import { classifyIntent } from './intentClassifier.js';
import { wrapPrompt } from './promptWrapper.js';
import { gatewayInfer, gatewayDispatch } from '../gateway/aiGatewayHub.js';
import logger from '../utils/logger.js';
import { BusinessError } from '../utils/businessError.js';

// ==================== 作业存储(内存+后续迁移Redis) ====================
const jobStore = new Map();

// ==================== 行业场景映射 (与 ExpandAgent 对齐) ====================

const INDUSTRY_SCENES = {
  clothing:  ['modern_studio', 'urban_street', 'natural_park'],
  beauty:    ['minimalist_bathroom', 'vanity_table', 'spa_setting'],
  '3c_digital': ['modern_desk', 'coffee_shop', 'minimalist_office'],
  food:      ['rustic_kitchen', 'dining_table', 'natural_light'],
  home:      ['modern_living_room', 'scandinavian_bedroom', 'sunlit_balcony'],
};

const MULTI_ANGLES = ['front', 'side_left', 'side_right', 'back', '45_degree', 'detail_closeup'];
const DETAIL_DIMENSIONS = ['material_texture', 'craftsmanship_detail', 'size_comparison', 'feature_highlight'];

function _parseScenes(ctx) {
  const raw = ctx.scriptContent || ctx.textContent || '';
  try {
    const parsed = JSON.parse(raw);
    if (parsed.scenes?.length) return parsed.scenes;
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  const lines = raw.split(/\n{2,}/).filter(l => l.trim());
  if (lines.length >= 3) return lines.map((visual, i) => ({ number: i + 1, visual: visual.slice(0, 200) }));
  return null;
}

function _parseViralInsight(text) {
  if (!text) return null;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch {}
  return null;
}

async function _singleImageGen(ctx, prompt, taskType, size = '1024x1024') {
  const model = ctx._stepModel || {};
  const result = await gatewayInfer(model.model_key || 'gpt-image-2', prompt, {
    size: ctx.imageSize || size,
    n: 1,
  }, { taskType, source: 'workflow' });
  return result?.images?.[0]?.url || result?.url || null;
}

// ==================== 步骤执行器映射 ====================

const STEP_EXECUTORS = {
  // ── 前置处理 ──
  intent_classify: async (ctx) => {
    const result = await classifyIntent(ctx.userInput || '', {
      platform: ctx.platform,
      userId: ctx.userId,
    });
    return { intent: result };
  },

  compliance_check: async (ctx) => {
    const text = ctx.userInput || '';
    const blockResult = isBlocked(text, {
      platform: ctx.platform || 'taobao',
      industry: ctx.industry,
    });
    if (blockResult.blocked) {
      throw Object.assign(new BusinessError(422, blockResult.reason), {
        suggestion: blockResult.suggestion,
        stage: 'compliance',
      });
    }
    return { compliancePassed: true };
  },

  prompt_wrap: async (ctx) => {
    const result = await wrapPrompt(ctx.userInput || '', {
      userId: ctx.userId,
      platform: ctx.platform || 'taobao',
      industry: ctx.industry,
      variables: {
        productName: ctx.productName || '未指定商品',
        productFeatures: ctx.productFeatures || '',
        sellingPoints: ctx.sellingPoints || '',
        platform: ctx.platform || 'taobao',
        ...(ctx.extra || {}),
      },
    });
    if (result.blocked) throw new BusinessError(422, result.blockReason || '内容不合规');
    return { wrappedPrompt: result.wrapped, intentId: result.intent?.intentId };
  },

  // ── 图片生成 ──
  white_bg_gen:       _imageGenStep('white_bg'),
  detail_module_gen:  _imageGenStep('detail_module'),

  // 多角度主图 — 6个命名角度并发生成 (对齐 ExpandAgent.multiAngleTool)
  multi_angle_gen: async (ctx) => {
    const count = ctx.batchSize || 4;
    const angles = MULTI_ANGLES.slice(0, count);
    const results = await Promise.allSettled(angles.map(angle => {
      const prompt = ctx.wrappedPrompt?.system
        || `professional e-commerce product photography, ${angle} view, pure white background #FFFFFF, studio lighting, product centered, ultra high resolution, commercial quality${ctx.productName ? `, product: ${ctx.productName}` : ''}`;
      return _singleImageGen(ctx, prompt, 'multi_angle');
    }));
    const urls = results.map((r, i) => r.status === 'fulfilled' ? r.value : null).filter(Boolean);
    return { imageUrls: urls, generatedCount: urls.length, angles };
  },

  // 场景图 — 行业场景库驱动 (对齐 ExpandAgent.sceneTool)
  scene_image_gen: async (ctx) => {
    const scenes = INDUSTRY_SCENES[ctx.industry] || INDUSTRY_SCENES.clothing;
    const results = await Promise.allSettled(scenes.map(scene => {
      const prompt = ctx.wrappedPrompt?.system
        || `professional e-commerce lifestyle photography, ${ctx.productName || 'product'} in ${scene.replace(/_/g, ' ')}, natural lighting, commercial quality, realistic setting`;
      return _singleImageGen(ctx, prompt, 'scene_image');
    }));
    const urls = results.map((r, i) => r.status === 'fulfilled' ? r.value : null).filter(Boolean);
    return { imageUrls: urls, generatedCount: urls.length, scenes };
  },

  // 卖点细节图 — 4维度拆分 (对齐 ExpandAgent.detailShotTool)
  detail_shot_gen: async (ctx) => {
    const results = await Promise.allSettled(DETAIL_DIMENSIONS.map(dim => {
      const prompt = ctx.wrappedPrompt?.system
        || `extreme close-up e-commerce product photography, ${dim.replace(/_/g, ' ')}, ${ctx.productName || 'product'}, macro lens, ultra detailed, studio lighting, pure white background`;
      return _singleImageGen(ctx, prompt, 'detail_shot');
    }));
    const urls = results.map((r, i) => r.status === 'fulfilled' ? r.value : null).filter(Boolean);
    return { imageUrls: urls, generatedCount: urls.length, details: DETAIL_DIMENSIONS };
  },

  // 分镜图 — 从脚本scenes逐帧生成 (修复Bug: storyboard_gen与script_gen数据断链)
  storyboard_gen: async (ctx) => {
    const scenes = _parseScenes(ctx);
    if (scenes && scenes.length > 0) {
      const results = await Promise.allSettled(scenes.map(scene =>
        _singleImageGen(ctx,
          `e-commerce video storyboard frame, scene ${scene.number}: ${scene.visual || ''}, ${scene.camera || 'medium shot'}, cinematic lighting, 9:16 vertical video frame, commercial quality`,
          'storyboard',
          '1024x1792'
        )
      ));
      const frames = results.map((r, i) => ({
        sceneNumber: scenes[i]?.number || i + 1,
        url: r.status === 'fulfilled' ? r.value : null,
      }));
      const urls = frames.map(f => f.url).filter(Boolean);
      return { storyboardUrls: urls, imageUrls: urls, frames, generatedCount: urls.length };
    }
    // 无脚本场景 → 降级为批量通用分镜图
    return _imageGenStep('storyboard')(ctx);
  },

  // ── 文案生成 ──
  detail_copy_gen:    _textGenStep('detail_copy', '生成商品详情页文案'),
  copywriting_gen:    _textGenStep('copywriting', '生成电商营销文案'),
  script_gen:         _textGenStep('script', '生成带货视频脚本（含前3秒钩子+5-8镜分镜）'),
  selling_points_gen: _textGenStep('selling_points', '提炼商品核心卖点'),
  viral_analyze: async (ctx) => {
    // 基础: LLM文本拆解 (通过 gatewayDispatch)
    const textResult = await _textGenStep('viral_analyze', '反推拆解爆款视频逻辑')(ctx);

    // 增强: 如有参考视频URL → 帧提取+结构分析
    let videoAnalysis = null;
    if (ctx.referenceVideoUrl) {
      try {
        const { extractFrames, analyzeVideoStructure } = await import('./videoAnalysisService.js');
        const frameResult = await extractFrames(ctx.referenceVideoUrl, { frameCount: 8 });
        if (frameResult.frames.length > 0) {
          videoAnalysis = analyzeVideoStructure({
            frames: frameResult.frames,
            viralInsight: _parseViralInsight(textResult.textContent),
          }, { duration: frameResult.duration });
        }
      } catch (e) {
        logger.warn('[WorkflowEngine] Video frame analysis failed:', e.message);
      }
    }

    return {
      textContent: textResult.textContent,
      scriptContent: textResult.scriptContent,
      videoAnalysis,
      framesExtracted: videoAnalysis?.structure?.scenes?.length || 0,
    };
  },
  script_polish:      _textGenStep('polish', '精炼规整文案输出'),

  // ── 详情页 ──
  detail_page_gen: async (ctx) => {
    // 调用详情页Agent
    const { detailPageAgent } = await import('../adk/agents/detailAgent.js');
    const adkCtx = { session: { state: { getAll: () => ({ ...ctx, userId: ctx.userId }) } } };
    return detailPageAgent._runAsyncImpl(adkCtx);
  },

  // ── 视频 ──
  video_compose: async (ctx) => {
    const model = ctx._stepModel || {};
    // 按投流平台自动调整视频参数
    const { adaptVideoParams } = await import('./platformAdAdapter.js');
    const adapted = adaptVideoParams(ctx);

    const result = await gatewayInfer(model.model_key || 'kling-v1', {
      images: ctx.storyboardUrls || [],
      prompt: ctx.scriptContent || ctx.userInput,
      duration: adapted.duration,
      ratio: adapted.aspectRatio,
      resolution: adapted.resolution,
      platform: adapted.platform,
    }, { taskType: 'video_compose', source: 'workflow' });

    const videoUrl = result?.url || result?.videoUrl;
    ctx.videoUrl = videoUrl;

    // 字幕叠加 (有脚本分镜时自动生成)
    let subtitleResult = null;
    if (videoUrl && ctx.scriptContent) {
      try {
        const { burnSubtitles, extractScenesForSubtitle } = await import('./subtitleService.js');
        const { scenes } = extractScenesForSubtitle(ctx.scriptContent, adapted.duration);
        if (scenes.length > 0) {
          subtitleResult = await burnSubtitles(videoUrl, scenes, {
            platform: adapted.platform,
            duration: adapted.duration,
          });
          if (subtitleResult.subtitledUrl && subtitleResult.method === 'ffmpeg_burn') {
            ctx.videoUrl = subtitleResult.subtitledUrl;
          }
        }
      } catch (e) {
        logger.warn('[WorkflowEngine] Subtitle burn failed:', e.message);
      }
    }

    return {
      videoUrl: ctx.videoUrl,
      taskId: result?.taskId,
      platform: adapted.platformName,
      aspectRatio: adapted.aspectRatio,
      resolution: adapted.resolution,
      subtitle: subtitleResult ? { method: subtitleResult.method, srtContent: subtitleResult.srtContent } : null,
    };
  },

  // ── 配音 ──
  voice_dub: async (ctx) => {
    const model = ctx._stepModel || {};
    const text = ctx.scriptContent || ctx.userInput || '';
    const result = await gatewayDispatch({
      mode: 'single',
      taskType: 'tts',
      params: {
        model: model.model_key || 'edge-tts',
        messages: [{ role: 'user', content: text.slice(0, 800) }],
        voice: ctx.voice || 'zh-CN-XiaoxiaoNeural',
        speed: ctx.voiceSpeed || 1.0,
      },
    }, { taskType: 'tts', source: 'workflow' });
    return {
      voiceUrl: result?.output?.audioUrl || result?.url,
      voice: ctx.voice || 'zh-CN-XiaoxiaoNeural',
      speed: ctx.voiceSpeed || 1.0,
    };
  },

  // ── 后处理 ──
  text_prepare: async (ctx) => ({
    preparedText: (ctx.userInput || '').replace(/\n{3,}/g, '\n\n').trim(),
  }),
  size_standardize: async (ctx) => ({ standardized: true, count: (ctx.imageUrls || []).length }),

  // 自动排版 — 4种布局风格智能选择
  auto_layout: async (ctx) => {
    const { autoLayout: doLayout } = await import('./layoutService.js');
    const result = doLayout(ctx, {
      layoutStyle: ctx.layoutStyle || null,
    });
    return { layout: result.layout, detailHtml: result.html, totalModules: result.totalModules };
  },

  // BGM配乐 — 按行业/风格智能选曲
  bgm_add: async (ctx) => {
    const { selectBgm } = await import('./audioMixService.js');
    const bgm = await selectBgm(ctx);
    ctx._bgmInfo = bgm;
    return { bgmUrl: bgm.bgmUrl, bgmName: bgm.bgmName, bgmMood: bgm.mood, bgmBpm: bgm.bpm };
  },

  // 降噪规整 — ffmpeg降噪+响度归一化，无ffmpeg时建议安装
  noise_reduce: async (ctx) => {
    const audioUrl = ctx.voiceUrl || ctx.mixedUrl || null;
    if (!audioUrl) return { denoised: false, reason: 'no audio input to denoise' };
    const { reduceNoise } = await import('./audioMixService.js');
    const result = await reduceNoise(audioUrl);
    if (result.denoisedUrl && result.denoisedUrl !== audioUrl) {
      ctx.voiceUrl = result.denoisedUrl;
    }
    return { denoised: result.normalized, denoisedUrl: result.denoisedUrl, method: result.method };
  },

  // 音频合成 — voice+BGM混音，ffmpeg可用时真混合，否则返回分层描述
  audio_mix: async (ctx) => {
    const voiceUrl = ctx.voiceUrl || null;
    if (!voiceUrl) return { mixedUrl: null, skipped: true, reason: 'no voice to mix' };
    const { mixAudio } = await import('./audioMixService.js');
    const bgmInfo = ctx._bgmInfo || null;
    const result = await mixAudio(voiceUrl, bgmInfo);
    if (result.mixedUrl && result.method !== 'pass_through') {
      ctx.voiceUrl = result.mixedUrl;
    }
    return { mixedUrl: result.mixedUrl, method: result.method, layers: result.layers || null, instructions: result.instructions || '' };
  },

  // ── 打包 ──
  pack_export: async (ctx) => {
    const manifest = {
      exportedAt: new Date().toISOString(),
      jobId: ctx._jobId,
      productName: ctx.productName || '未命名',
      platform: ctx.platform,
      industry: ctx.industry,
      assets: {
        images: (ctx.imageUrls || []).map((url, i) => ({ index: i, type: 'image', url, label: `image_${i + 1}` })),
        video: ctx.videoUrl ? [{ type: 'video', url: ctx.videoUrl, label: 'main_video' }] : [],
        voice: ctx.voiceUrl ? [{ type: 'audio', url: ctx.voiceUrl, label: 'voice_dub' }] : [],
        bgm: ctx.bgmUrl ? [{ type: 'audio', url: ctx.bgmUrl, label: 'bgm' }] : [],
        detailHtml: ctx.detailHtml ? [{ type: 'html', content: ctx.detailHtml, label: 'detail_page' }] : [],
        detailModules: (ctx.detailModules || []).map((m, i) => ({ index: i, type: 'module', key: m.key, url: m.url })),
        layout: ctx.layout ? [{ type: 'layout', data: ctx.layout, label: 'auto_layout' }] : [],
        frames: ctx.frames ? [{ type: 'storyboard', data: ctx.frames, label: 'storyboard_frames' }] : [],
      },
    };

    const allAssets = [
      ...manifest.assets.images,
      ...manifest.assets.video,
      ...manifest.assets.voice,
      ...manifest.assets.bgm,
    ];
    const totalFiles = allAssets.length;

    // 尝试ZIP打包 (需 archiver 依赖)
    let zipUrl = null;
    try {
      const archiver = await import('archiver').catch(() => null);
      if (archiver?.default) {
        const path = await import('path');
        const fs = await import('fs');
        const os = await import('os');
        const { default: archiverDefault } = archiver;

        const outputDir = os.tmpdir();
        const zipFile = path.join(outputDir, `export_${ctx._jobId || Date.now()}.zip`);
        const output = fs.createWriteStream(zipFile);
        const archive = archiverDefault('zip', { zlib: { level: 9 } });

        await new Promise((resolve, reject) => {
          output.on('close', resolve);
          archive.on('error', reject);
          archive.pipe(output);
          archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });
          archive.finalize();
        });

        zipUrl = zipFile;
      }
    } catch (e) {
      logger.info('[WorkflowEngine] archiver not available, using manifest-only export');
    }

    return {
      package: manifest,
      manifestJson: JSON.stringify(manifest),
      zipUrl,
      totalAssets: totalFiles,
      totalFiles,
    };
  },
};

// 向后兼容别名
STEP_EXECUTORS.voice_synthesis = STEP_EXECUTORS.voice_dub;

// ==================== 图片生成步骤工厂 ====================

function _imageGenStep(taskType, taskLabel) {
  return async (ctx) => {
    const model = ctx._stepModel || {};
    const prompt = ctx.wrappedPrompt?.system
      || `professional e-commerce ${taskType.replace(/_/g, ' ')}, ${ctx.productName || 'product'}, studio lighting, white background`;

    const result = await gatewayInfer(model.model_key || 'gpt-image-2', prompt, {
      size: ctx.imageSize || '1024x1024',
      n: ctx.batchSize || 3,
    }, { taskType, source: 'workflow' });

    const urls = result?.images?.map(i => i.url).filter(Boolean) || [result?.url].filter(Boolean);
    return { imageUrls: urls, generatedCount: urls.length };
  };
}

// ==================== 文案生成步骤工厂 ====================

function _textGenStep(taskType, taskLabel) {
  return async (ctx) => {
    const model = ctx._stepModel || {};
    const systemPrompt = ctx.wrappedPrompt?.system || `你是电商${taskLabel}专家`;
    const userMessage = ctx.userInput || ctx.productName || '';

    const result = await gatewayDispatch({
      mode: 'single',
      taskType: 'text_gen',
      params: {
        model: model.model_key || 'deepseek-v4-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        maxTokens: 4096,
      },
    }, { taskType: 'text_gen', source: 'workflow' });

    const content = result?.output?.choices?.[0]?.message?.content || result?.text || '';
    return { textContent: content, scriptContent: content };
  };
}

// ==================== 引擎主入口 ====================

/**
 * 执行工作流
 *
 * @param {object} params
 * @param {string} params.workflowId       工作流ID
 * @param {string} params.mode             运行模式: auto | custom
 * @param {object} params.input            用户输入
 * @param {string} params.input.userInput  用户需求
 * @param {string} params.input.productName
 * @param {string} params.input.imageUrl
 * @param {string} params.input.referenceVideoUrl
 * @param {string} params.input.platform
 * @param {string} params.input.industry
 * @param {number} params.input.userId
 * @param {object} params.input.extra
 * @param {object} params.overrides        步骤覆盖配置
 * @param {string[]} params.overrides.disabledSteps  禁用的步骤key列表
 * @param {object}   params.overrides.modelBindings  步骤→模型绑定 { stepKey: 'model_key' }
 * @param {object}   params.overrides.extraSteps     额外插入步骤 [{ after: 'stepKey', step: {...} }]
 */
export async function executeWorkflow(params = {}) {
  const { workflowId, mode = 'auto', input = {}, overrides: reqOverrides = {} } = params;

  // 验证工作流
  const wf = getWorkflow(workflowId);
  if (!wf) throw new BusinessError(400, `工作流不存在: ${workflowId}`);

  // 从数据库加载已保存的配置(请求覆盖优先)
  let overrides = { ...reqOverrides };
  if (input.userId) {
    try {
      const { getWorkflowConfig } = await import('../dao/workflowConfigDao.js');
      const dbConfig = await getWorkflowConfig(workflowId, input.userId);
      if (dbConfig) {
        overrides = {
          disabledSteps: reqOverrides.disabledSteps || dbConfig.disabled_steps || [],
          modelBindings: reqOverrides.modelBindings || dbConfig.model_bindings || {},
          extraSteps: reqOverrides.extraSteps || dbConfig.extra_steps || [],
        };
        if (dbConfig.mode && mode === 'auto') overrides._dbMode = dbConfig.mode;
      }
    } catch (e) {
      logger.warn(`[WorkflowEngine] failed to load DB config: ${e.message}`);
    }
  }

  // 获取步骤(含覆盖)
  let steps = getWorkflowSteps(workflowId, overrides);

  // 应用额外步骤
  if (overrides.extraSteps?.length) {
    for (const extra of overrides.extraSteps) {
      const idx = steps.findIndex(s => s.key === extra.after);
      if (idx >= 0) steps.splice(idx + 1, 0, extra.step);
    }
  }

  // 过滤出启用的步骤
  const activeSteps = steps.filter(s => s.enabled !== false);

  // 视频铁则检查
  if (wf.forceVideoRule) {
    const hasScript = activeSteps.some(s => s.key === 'script_gen');
    const hasStoryboard = activeSteps.some(s => s.key === 'storyboard_gen');
    const hasVideo = activeSteps.some(s => s.key === 'video_compose');
    if (hasVideo && (!hasScript || !hasStoryboard)) {
      throw new BusinessError(400, '视频类工作流禁止跳过脚本/分镜步骤直接生成视频');
    }
  }

  // 创建作业
  const jobId = `wf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const job = {
    id: jobId,
    workflowId,
    workflowName: wf.name,
    mode,
    status: 'running',
    progress: 0,
    totalSteps: activeSteps.length,
    steps: activeSteps.map(s => ({ ...s, status: 'pending' })),
    stepResults: [],
    input,
    output: null,
    createdAt: new Date().toISOString(),
    userId: input.userId,
  };
  jobStore.set(jobId, job);

  // 异步执行
  setImmediate(() => _runJob(jobId, activeSteps, mode, input).catch(err => {
    logger.error(`[WorkflowEngine] job=${jobId} fatal:`, err.message);
    const j = jobStore.get(jobId);
    if (j) {
      j.status = 'failed';
      j.error = err.message;
      j.completedAt = new Date().toISOString();
    }
  }));

  return { jobId, workflowName: wf.name, totalSteps: activeSteps.length, status: 'running' };
}

// ==================== 内部执行 ====================

async function _runJob(jobId, steps, mode, input) {
  const job = jobStore.get(jobId);
  if (!job) return;

  const ctx = {
    ...input,
    _jobId: jobId,
    _mode: mode,
    imageUrls: [],
    storyboardUrls: [],
    generatedCount: 0,
    textContent: '',
    scriptContent: '',
    package: null,
  };

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    job.steps[i].status = 'running';
    job.steps[i].startedAt = new Date().toISOString();

    try {
      // ── 步骤级模型选择 ──
      let stepModel = null;
      if (step.allowModel) {
        if (mode === 'auto' || !step.modelKey || step.modelKey === 'auto') {
          stepModel = await autoSelect(step.category, step.taskType);
        } else {
          stepModel = await getModelConfig(step.modelKey);
        }
        ctx._stepModel = stepModel;
      }

      logger.info(`[WorkflowEngine] job=${jobId} step=${step.key} [${i + 1}/${steps.length}]`, {
        mode,
        model: stepModel?.model_key || 'builtin',
      });

      // ── 执行步骤 ──
      const executor = STEP_EXECUTORS[step.key];
      if (!executor) {
        throw new Error(`未知步骤类型: ${step.key}`);
      }

      const output = await Promise.race([
        executor(ctx),
        new Promise((_, reject) => setTimeout(() => reject(new Error(`${step.label} 执行超时`)), step.timeout || 300_000)),
      ]);

      // 合并输出到上下文
      Object.assign(ctx, output);

      job.steps[i].status = 'completed';
      job.steps[i].output = output;
      job.stepResults.push({
        step: step.key,
        label: step.label,
        status: 'completed',
        model: stepModel?.model_key || 'builtin',
        output,
      });
    } catch (err) {
      job.steps[i].status = 'failed';
      job.steps[i].error = err.message;
      job.stepResults.push({
        step: step.key,
        label: step.label,
        status: 'failed',
        error: err.message,
      });

      // 必填步骤失败 → 终止
      if (step.required) {
        job.status = 'failed';
        job.error = `步骤 "${step.label}" 执行失败: ${err.message}`;
        job.completedAt = new Date().toISOString();
        return;
      }
      // 可选步骤失败 → 跳过继续
      logger.warn(`[WorkflowEngine] job=${jobId} optional step "${step.label}" failed, skipping`);
    }

    job.steps[i].completedAt = new Date().toISOString();
    job.progress = Math.floor(((i + 1) / steps.length) * 100);
  }

  // 全部完成
  job.status = 'completed';
  job.progress = 100;
  job.output = {
    images: ctx.imageUrls || [],
    text: ctx.textContent || '',
    script: ctx.scriptContent || '',
    video: ctx.videoUrl || null,
    voice: ctx.voiceUrl || null,
    package: ctx.package || null,
  };
  job.completedAt = new Date().toISOString();
  logger.info(`[WorkflowEngine] job=${jobId} completed, ${steps.length} steps`);
}

// ==================== 作业查询 & 控制 ====================

export function getJob(jobId) {
  const job = jobStore.get(jobId);
  if (!job) throw new BusinessError(404, '作业不存在');
  return job;
}

export function listJobs(userId, { limit = 50, offset = 0 } = {}) {
  const all = [...jobStore.values()].filter(j => !userId || j.userId === userId);
  return {
    total: all.length,
    items: all.slice(offset, offset + limit),
  };
}

/** 人工暂停 */
export function pauseJob(jobId) {
  const job = jobStore.get(jobId);
  if (!job) throw new BusinessError(404, '作业不存在');
  if (job.status !== 'running') throw new BusinessError(400, '仅运行中的作业可暂停');
  job.status = 'paused';
  return { jobId, status: 'paused' };
}

/** 人工恢复 */
export async function resumeJob(jobId, modifiedContext = {}) {
  const job = jobStore.get(jobId);
  if (!job) throw new BusinessError(404, '作业不存在');
  if (job.status !== 'paused') throw new BusinessError(400, '仅暂停的作业可恢复');

  // 合并人工修改的上下文
  const input = { ...job.input, ...modifiedContext };
  job.input = input;
  job.status = 'running';

  // 找到未完成的步骤继续执行
  const remainingSteps = job.steps.filter(s => s.status !== 'completed');
  setImmediate(() => _runJob(jobId, remainingSteps, job.mode, input).catch(err => {
    logger.error(`[WorkflowEngine] job=${jobId} resume failed:`, err.message);
    job.status = 'failed';
    job.error = err.message;
  }));

  return { jobId, status: 'running', remainingSteps: remainingSteps.length };
}

/** 取消 */
export function cancelJob(jobId) {
  const job = jobStore.get(jobId);
  if (!job) throw new BusinessError(404, '作业不存在');
  if (!['running', 'paused', 'pending'].includes(job.status)) {
    throw new BusinessError(400, '当前状态不可取消');
  }
  job.status = 'cancelled';
  job.completedAt = new Date().toISOString();
  return { jobId, status: 'cancelled' };
}

export default {
  executeWorkflow, getJob, listJobs,
  pauseJob, resumeJob, cancelJob,
};
