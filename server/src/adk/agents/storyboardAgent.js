/**
 * ADK Agent #5 — 脚本分镜 Agent（叙事力）
 * "自动生成带货文案、投流脚本、5-8镜分镜、爆款节奏、前3秒钩子、卖点卡点"
 * "支持爆款视频反推拆解逻辑"
 *
 * 能力链：
 *   爆款分析 → 脚本生成 → 分镜拆解 → 视觉Prompt → 配音生成 → 视频合成
 */
import { BaseAgent } from '../core/agent.js';
import { FunctionTool } from '../core/tool.js';
import logger from '../../utils/logger.js';

// ==================== 工具定义 ====================

const viralAnalyzeTool = new FunctionTool('analyze_viral_video', async (params) => {
  const { gatewayRoute } = await import('../../gateway/aiGatewayHub.js');

  const prompt = `你是一个爆款视频分析专家。分析以下视频内容，提取爆款公式：

视频描述/链接: ${params.videoUrl || params.videoDescription || '未提供'}

请严格返回JSON，分析爆款逻辑：
{
  "hookType": "前3秒钩子类型（好奇心/冲突/对比/悬念/痛点）",
  "hookScript": "前3秒钩子文案",
  "pacePattern": "节奏模式（快节奏/慢节奏/快慢交替）",
  "sellingCardCount": "卖点卡点数量(3-8)",
  "sellingCards": ["卖点1", "卖点2", "卖点3"],
  "closingStyle": "结尾风格（引导点击/制造稀缺/品牌升华）",
  "estimatedDuration": "预估时长(秒)",
  "musicStyle": "配乐风格",
  "viralFormula": "爆款公式一句话总结"
}`;

  const result = await gatewayRoute({
    mode: 'single',
    taskType: 'text_gen',
    params: {
      model: 'qwen-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      maxTokens: 800,
    },
  });

  const raw = result?.output?.choices?.[0]?.message?.content || '';
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  return jsonMatch ? JSON.parse(jsonMatch[0]) : { viralFormula: '分析失败，请提供更清晰的视频描述' };
}, {
  description: '反推分析爆款视频逻辑（钩子/节奏/卡点/结尾公式）',
  parameters: {
    videoUrl: { type: 'string', description: '爆款视频URL' },
    videoDescription: { type: 'string', description: '视频内容描述' },
  },
});

const scriptTool = new FunctionTool('generate_shooting_script', async (params) => {
  const { gatewayRoute } = await import('../../gateway/aiGatewayHub.js');

  const prompt = `你是一个带货视频脚本专家。为以下商品生成完整带货脚本：

商品: ${params.productName || '未指定'}
卖点: ${params.sellingPoints || '高品质'}
平台: ${params.platform || '抖音'}
时长: ${params.duration || 30}秒
${params.viralInsight ? `爆款参考: ${params.viralInsight}` : ''}

返回JSON格式：
{
  "title": "脚本标题",
  "totalDuration": ${params.duration || 30},
  "hook": { "seconds": "0-3", "script": "前3秒钩子文案", "visual": "画面对应描述" },
  "scenes": [
    { "number": 1, "seconds": "3-8", "script": "口播文案", "visual": "画面描述", "camera": "运镜方式" },
    { "number": 2, "seconds": "8-13", "script": "口播文案", "visual": "画面描述", "camera": "运镜方式" }
  ],
  "closing": { "seconds": "最后3秒", "script": "结尾引导文案", "visual": "结尾画面" },
  "tags": ["推荐标签1", "推荐标签2"],
  "musicHint": "推荐配乐类型"
}

规则：scenes至少5个，最多8个，每个scene的时长均匀分配。前3秒必须有强钩子。`;

  const result = await gatewayRoute({
    mode: 'single',
    taskType: 'text_gen',
    params: {
      model: 'deepseek-v4-pro',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      maxTokens: 2000,
    },
  });

  const raw = result?.output?.choices?.[0]?.message?.content || '';
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
}, {
  description: '生成带货视频完整拍摄脚本（含分镜/口播/运镜/配乐建议）',
  parameters: {
    productName: { type: 'string', description: '商品名称' },
    sellingPoints: { type: 'string', description: '卖点' },
    platform: { type: 'string', description: '目标平台' },
    duration: { type: 'number', description: '视频时长(秒)' },
    viralInsight: { type: 'string', description: '爆款参考洞察' },
  },
});

const storyboardTool = new FunctionTool('generate_storyboard_images', async (params) => {
  const { gatewayInfer } = await import('../../gateway/aiGatewayHub.js');

  let scenes = [];
  try { scenes = typeof params.scenes === 'string' ? JSON.parse(params.scenes) : (params.scenes || []); } catch {}

  const results = await Promise.allSettled(scenes.map(scene =>
    gatewayInfer('gpt-image-2', {
      prompt: `e-commerce video storyboard frame, scene ${scene.number}: ${scene.visual}, ${scene.camera || 'medium shot'}, cinematic lighting, 9:16 vertical video frame, commercial quality`,
      size: '1024x1792',
    }, { taskType: 'image_gen', source: 'storyboard' })
  ));

  return {
    type: 'storyboard_frames',
    frames: results.map((r, i) => ({
      sceneNumber: scenes[i]?.number || i + 1,
      description: scenes[i]?.visual || '',
      url: r.status === 'fulfilled' ? (r.value?.images?.[0]?.url || r.value?.url) : null,
    })),
  };
}, {
  description: '根据分镜脚本生成对应画面图（5-8帧）',
  parameters: {
    scenes: { type: 'string', description: '分镜场景JSON数组' },
  },
});

// ==================== Agent 定义 ====================

export class ScriptStoryboardAgent extends BaseAgent {
  constructor() {
    super({
      name: 'script_storyboard',
      description: '叙事力 — 脚本分镜+爆款复刻（文案→分镜→画面→合成）',
      tools: [viralAnalyzeTool, scriptTool, storyboardTool],
      outputKey: 'storyboard_result',
    });
  }

  async _runAsyncImpl(ctx) {
    const state = ctx.session.state.getAll();
    const userInput = state.userInput || '';
    const productName = state.productName || '';
    const sellingPoints = state.sellingPoints || '';
    const platform = state.platform || 'douyin';
    const duration = state.videoDuration || 30;
    const videoUrl = state.referenceVideoUrl || '';

    const result = { viralAnalysis: null, script: null, storyboard: null };

    // Step 1: 爆款视频分析（如果提供了参考视频）
    if (videoUrl || (userInput && (userInput.includes('复刻') || userInput.includes('仿拍') || userInput.includes('翻拍')))) {
      try {
        result.viralAnalysis = await viralAnalyzeTool.fn({
          videoUrl,
          videoDescription: userInput,
        });
        logger.info('[StoryboardAgent] Viral analysis complete');
      } catch (err) {
        logger.warn('[StoryboardAgent] Viral analysis failed:', err.message);
      }
    }

    // Step 2: 生成脚本
    try {
      result.script = await scriptTool.fn({
        productName: productName || userInput,
        sellingPoints,
        platform,
        duration,
        viralInsight: result.viralAnalysis?.viralFormula || '',
      });
      logger.info('[StoryboardAgent] Script generated', {
        scenes: result.script?.scenes?.length || 0,
      });
    } catch (err) {
      logger.warn('[StoryboardAgent] Script generation failed:', err.message);
    }

    // Step 3: 生成分镜画面
    if (result.script?.scenes?.length > 0) {
      try {
        result.storyboard = await storyboardTool.fn({
          scenes: JSON.stringify(result.script.scenes),
        });
        logger.info('[StoryboardAgent] Storyboard frames generated');
      } catch (err) {
        logger.warn('[StoryboardAgent] Storyboard generation failed:', err.message);
      }
    }

    const summary = {
      hasViralAnalysis: !!result.viralAnalysis,
      viralFormula: result.viralAnalysis?.viralFormula || null,
      scriptTitle: result.script?.title || null,
      sceneCount: result.script?.scenes?.length || 0,
      frameCount: result.storyboard?.frames?.filter(f => f.url)?.length || 0,
      hook: result.script?.hook?.script || null,
    };

    logger.info('[StoryboardAgent] Complete', summary);
    return { ...result, summary };
  }
}

export const scriptStoryboardAgent = new ScriptStoryboardAgent();
