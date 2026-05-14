/**
 * 工作流步骤执行器 (Step Executors)
 *
 * 从 unifiedWorkflowEngine.js 拆分而来。
 * 每个步骤执行器对应工作流中的一个步骤 key，由 _runJob 循环调用。
 */

import { classifyIntent } from './intentClassifier.js';
import { isBlocked } from './adComplianceEngine.js';
import { wrapPrompt } from './promptWrapper.js';
import { matchAndFill } from './templateEngine.js';
import { gatewayInfer, gatewayDispatch } from '../gateway/aiGatewayHub.js';
import logger from '../utils/logger.js';
import { BusinessError } from '../utils/businessError.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { INDUSTRY_SCENES } from './industryConfig.js';

// ==================== 常量 ====================

const MULTI_ANGLES = ['front', 'side_left', 'side_right', 'back', '45_degree', 'detail_closeup'];
const DETAIL_DIMENSIONS = ['material_texture', 'craftsmanship_detail', 'size_comparison', 'feature_highlight'];

/** 步骤执行器 → 模板引擎 intentId 映射 */
const STEP_INTENT_MAP = {
  white_bg_gen:      'white_bg',
  multi_angle_gen:   'scene_image',
  scene_image_gen:   'scene_image',
  detail_shot_gen:   'detail_image',
  storyboard_gen:    'storyboard',
  detail_module_gen: 'detail_image',
};

// ==================== 辅助函数 ====================

function _parseScenes(ctx) {
  const raw = ctx.scriptContent || ctx.textContent || '';
  try {
    const parsed = JSON.parse(raw);
    if (parsed.scenes?.length) return parsed.scenes;
    if (Array.isArray(parsed)) return parsed;
  } catch (e) { logger.debug('[Workflow] _parseScenes JSON parse failed', { error: e.message }); }
  const lines = raw.split(/\n{2,}/).filter(l => l.trim());
  if (lines.length >= 3) return lines.map((visual, i) => ({ number: i + 1, visual: visual.slice(0, 200) }));
  return null;
}

function _parseViralInsight(text) {
  if (!text) return null;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch (e) { logger.debug('[Workflow] _parseViralInsight JSON parse failed', { error: e.message }); }
  return null;
}

async function _wrapStepPrompt(ctx, intentId) {
  const variables = {
    productName: ctx.productName || ctx.userInput || '商品',
    category: ctx.industry ? (INDUSTRY_SCENES[ctx.industry]?.category || '') : '',
    platform: ctx.platform || '通用',
    style: ctx.style || 'professional',
    sellingPoints: Array.isArray(ctx.sellingPoints)
      ? ctx.sellingPoints.join('；')
      : (ctx.sellingPoints || ''),
    resolution: ctx.imageSize || '2048x2048',
    language: ctx.language || 'zh-CN',
    features: ctx.productFeatures || '',
    specs: ctx.productSpecs || '',
    frameCount: ctx.storyboardCount || 6,
    mood: ctx.mood || 'warm natural',
  };
  const opts = {
    industry: ctx.industry,
    platform: ctx.platform,
    brandTone: ctx.brandTone,
    userId: ctx.userId,
  };
  const wrapped = await matchAndFill(intentId, variables, opts);
  ctx._lastStepWrapper = wrapped;
  return wrapped;
}

async function _singleImageGen(ctx, prompt, taskType, size = '1024x1024') {
  const model = ctx._stepModel || {};
  const result = await gatewayInfer(model.model_key || 'gpt-image-2', prompt, {
    size: ctx.imageSize || size,
    n: 1,
  }, { taskType, source: 'workflow' });
  return result?.images?.[0]?.url || result?.url || null;
}

/** 批量图片生成工厂 — 消除 multi_angle/scene/detail_shot/storyboard 四函数重复 */
async function _batchImageGenStep(ctx, { intentId, items, itemToPrompt, fallback, outputLabel, size = '1024x1024' }) {
  let basePrompt;
  try { const wrapped = await _wrapStepPrompt(ctx, intentId); basePrompt = wrapped.system; } catch { basePrompt = ''; }
  const results = await Promise.allSettled(items.map(item => {
    const prompt = (basePrompt ? basePrompt + '. ' : '') + fallback + ', ' + itemToPrompt(item);
    return _singleImageGen(ctx, prompt, intentId, size);
  }));
  const urls = results.map((r, i) => r.status === 'fulfilled' ? r.value : null).filter(Boolean);
  return { imageUrls: urls, generatedCount: urls.length, [outputLabel]: items };
}

// ==================== 步骤工厂 ====================

function _imageGenStep(taskType, taskLabel, intentId) {
  return async (ctx) => {
    const model = ctx._stepModel || {};
    let prompt;
    if (intentId) {
      try {
        const wrapped = await _wrapStepPrompt(ctx, intentId);
        prompt = wrapped.system + '\n\n' + wrapped.prompt;
      } catch (e) {
        logger.warn('[WorkflowEngine] _wrapStepPrompt failed for', intentId, e.message);
        prompt = `professional e-commerce ${taskType.replace(/_/g, ' ')}, ${ctx.productName || 'product'}, studio lighting, white background`;
      }
    } else {
      prompt = ctx.wrappedPrompt?.system
        || `professional e-commerce ${taskType.replace(/_/g, ' ')}, ${ctx.productName || 'product'}, studio lighting, white background`;
    }

    const result = await gatewayInfer(model.model_key || 'gpt-image-2', prompt, {
      size: ctx.imageSize || '1024x1024',
      n: ctx.batchSize || 3,
    }, { taskType, source: 'workflow' });

    const urls = result?.images?.map(i => i.url).filter(Boolean) || [result?.url].filter(Boolean);
    return { imageUrls: urls, generatedCount: urls.length };
  };
}

function _textGenStep(taskType, taskLabel) {
  return async (ctx) => {
    const model = ctx._stepModel || {};
    const systemPrompt = ctx.wrappedPrompt?.system || `你是电商${taskLabel}专家。目标平台: ${ctx.platform || '通用'}，行业: ${ctx.industry || '综合'}`;

    const userPrompt = ctx.wrappedPrompt?.prompt || '';
    const contextParts = [ctx.userInput || ctx.productName || ''];

    if (ctx.sellingPoints) {
      const points = Array.isArray(ctx.sellingPoints) ? ctx.sellingPoints.join('；') : ctx.sellingPoints;
      contextParts.push(`核心卖点: ${points}`);
    }
    if (ctx.viralFormula || ctx.viralInsight) {
      contextParts.push(`爆款参考: ${ctx.viralFormula || ctx.viralInsight}`);
    }
    if (ctx.industry && ctx.industry !== '综合') {
      contextParts.push(`行业: ${ctx.industry}`);
    }
    if (ctx.textContent && ctx.textContent.length > 10 && taskType !== 'copywriting') {
      contextParts.push(`前序产出: ${ctx.textContent.slice(0, 600)}`);
    }

    const userMessage = userPrompt || contextParts.filter(Boolean).join('\n\n');

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
      throw Object.assign(new BusinessError(ERROR_CODE.VALIDATION_ERROR, blockResult.reason), {
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
    if (result.blocked) throw new BusinessError(ERROR_CODE.CONTENT_MODERATION, result.blockReason || 'Content non-compliant');
    return { wrappedPrompt: result.wrapped, intentId: result.intent?.intentId };
  },

  // ── 图片生成 ──
  white_bg_gen: async (ctx) => {
    if (ctx.imageUrl) {
      try {
        const { generateWhiteBg } = await import('./backgroundRemovalService.js');
        const result = await generateWhiteBg({
          imageUrl: ctx.imageUrl,
          productName: ctx.productName || '',
          size: ctx.imageSize || '1024x1024',
        });
        if (result?.whiteBgUrl) {
          return { imageUrls: [result.whiteBgUrl], generatedCount: 1, model: result.model, method: 'dedicated_service' };
        }
      } catch (e) {
        logger.warn('[WorkflowEngine] backgroundRemovalService failed, fallback to generic', e.message);
      }
    }
    return _imageGenStep('white_bg', null, 'white_bg')(ctx);
  },
  detail_module_gen:  _imageGenStep('detail_module', null, 'detail_image'),

  multi_angle_gen: (ctx) => {
    const count = ctx.batchSize || 4;
    const angles = MULTI_ANGLES.slice(0, count);
    return _batchImageGenStep(ctx, {
      intentId: 'scene_image',
      items: angles,
      itemToPrompt: (angle) => `${angle} view${ctx.productName ? ', product: ' + ctx.productName : ''}`,
      fallback: 'professional e-commerce product photography, pure white background #FFFFFF, studio lighting, product centered, ultra high resolution, commercial quality',
      outputLabel: 'angles',
    });
  },

  scene_image_gen: (ctx) => {
    const scenes = INDUSTRY_SCENES[ctx.industry] || INDUSTRY_SCENES.clothing;
    return _batchImageGenStep(ctx, {
      intentId: 'scene_image',
      items: scenes,
      itemToPrompt: (scene) => `${ctx.productName || 'product'} in ${scene.replace(/_/g, ' ')}`,
      fallback: 'professional e-commerce lifestyle photography, natural lighting, commercial quality, realistic setting',
      outputLabel: 'scenes',
    });
  },

  detail_shot_gen: (ctx) => _batchImageGenStep(ctx, {
    intentId: 'detail_image',
    items: DETAIL_DIMENSIONS,
    itemToPrompt: (dim) => `${dim.replace(/_/g, ' ')}, ${ctx.productName || 'product'}`,
    fallback: 'extreme close-up e-commerce product photography, macro lens, ultra detailed, studio lighting, pure white background',
    outputLabel: 'details',
  }),

  storyboard_gen: async (ctx) => {
    const scenes = _parseScenes(ctx);
    if (scenes && scenes.length > 0) {
      const result = await _batchImageGenStep(ctx, {
        intentId: 'storyboard',
        items: scenes,
        itemToPrompt: (scene) =>
          `e-commerce video storyboard frame, scene ${scene.number}: ${scene.visual || ''}, ${scene.camera || 'medium shot'}, cinematic lighting, 9:16 vertical video frame, commercial quality`,
        fallback: '',
        outputLabel: 'scenes',
        size: '1024x1792',
      });
      result.storyboardUrls = result.imageUrls;
      result.frames = result.imageUrls.map((url, i) => ({ sceneNumber: i + 1, url }));
      return result;
    }
    return _imageGenStep('storyboard', null, 'storyboard')(ctx);
  },

  // ── 文案生成 ──
  detail_copy_gen:    _textGenStep('detail_copy', '生成商品详情页文案'),
  copywriting_gen:    _textGenStep('copywriting', '生成电商营销文案'),
  script_gen:         _textGenStep('script', '生成带货视频脚本（含前3秒钩子+5-8镜分镜）'),
  selling_points_gen: _textGenStep('selling_points', '提炼商品核心卖点'),
  viral_analyze: async (ctx) => {
    const textResult = await _textGenStep('viral_analyze', '反推拆解爆款视频逻辑')(ctx);

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
    const alreadyDone = {
      productInfo: !!ctx.productInfo,
      modules: !!(ctx.detailModules && ctx.detailModules.length > 0),
      sellingPoints: !!(ctx.sellingPoints && (Array.isArray(ctx.sellingPoints) ? ctx.sellingPoints.length > 0 : true)),
      layout: !!ctx.detailHtml,
    };
    const allDone = alreadyDone.productInfo && alreadyDone.modules && alreadyDone.sellingPoints && alreadyDone.layout;

    if (allDone) {
      return {
        productInfo: ctx.productInfo,
        modules: ctx.detailModules,
        sellingPoints: ctx.sellingPoints,
        layout: ctx.layout,
        detailHtml: ctx.detailHtml,
        source: 'merged_from_previous_steps',
      };
    }

    const augmentedCtx = { ...ctx, _alreadyDone: alreadyDone };

    const { detailPageAgent } = await import('../adk/agents/detailAgent.js');
    const adkCtx = { session: { state: { getAll: () => ({ ...augmentedCtx, userId: augmentedCtx.userId }) } } };
    const result = await detailPageAgent._runAsyncImpl(adkCtx);

    return {
      modules: alreadyDone.modules ? ctx.detailModules : result.modules,
      sellingPoints: alreadyDone.sellingPoints ? ctx.sellingPoints : result.sellingPoints,
      layout: alreadyDone.layout ? ctx.layout : result.layout,
      detailHtml: alreadyDone.layout ? ctx.detailHtml : result.detailHtml,
      source: Object.values(alreadyDone).filter(Boolean).length > 0 ? 'partial_merge' : 'full_agent',
    };
  },

  // ── 视频 ──
  video_compose: async (ctx) => {
    const model = ctx._stepModel || {};
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

  size_standardize: async (ctx) => {
    const urls = ctx.imageUrls || [];
    const platform = ctx.platform || 'taobao';
    const platformSizes = {
      taobao: { white_bg: '800x800', detail: '750x不限', scene: '800x800' },
      douyin: { white_bg: '1080x1080', detail: '1080x不限', scene: '1080x1920' },
    };
    const expected = platformSizes[platform] || platformSizes.taobao;

    const images = urls.map((url, i) => {
      const ext = (url || '').match(/\.(\w+)(\?|$)/)?.[1] || 'jpg';
      return { index: i, url, format: ext, expectedSize: expected.white_bg, platform };
    });

    return {
      standardized: urls.length > 0,
      count: urls.length,
      images,
      recommendedSizes: expected,
      platform,
    };
  },

  auto_layout: async (ctx) => {
    const { autoLayout: doLayout } = await import('./layoutService.js');
    const result = doLayout(ctx, {
      layoutStyle: ctx.layoutStyle || null,
    });
    return { layout: result.layout, detailHtml: result.html, totalModules: result.totalModules };
  },

  bgm_add: async (ctx) => {
    const { selectBgm } = await import('./audioMixService.js');
    const bgm = await selectBgm(ctx);
    ctx._bgmInfo = bgm;
    return { bgmUrl: bgm.bgmUrl, bgmName: bgm.bgmName, bgmMood: bgm.mood, bgmBpm: bgm.bpm };
  },

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

export { STEP_EXECUTORS, STEP_INTENT_MAP, MULTI_ANGLES, DETAIL_DIMENSIONS };
export default STEP_EXECUTORS;
