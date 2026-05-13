/**
 * ADK Agent #1 — 意图识别 Agent（识别力）
 * "自动识别客户需求类型，无需手动传type"
 *
 * 桥接 intentClassifier.js，提供 LLM 增强分类能力
 * 覆盖 4大类 × 14种意图
 */
import { LlmAgent } from '../core/agent.js';
import { FunctionTool } from '../core/tool.js';
import { classifyIntent, INTENT_TYPES } from '../../services/intentClassifier.js';

const classifyTool = new FunctionTool('classify_intent', async (params) => {
  const result = await classifyIntent(params.input, {
    platform: params.platform,
    userId: params.userId,
    historyTags: params.historyTags,
  });
  return result;
}, {
  description: '自动识别电商需求意图（主图/场景图/海报/详情页/视频/文案/脚本/配音），返回分类结果',
  parameters: {
    input: { type: 'string', description: '用户输入的原始需求描述' },
    platform: { type: 'string', description: '目标平台: taobao|douyin|jd|kuaishop' },
    userId: { type: 'string', description: '用户ID' },
    historyTags: { type: 'string', description: '历史标签' },
  },
});

export const IntentAgent = new LlmAgent({
  name: 'intent',
  description: '识别力 — 自动识别电商需求类型（图片/详情页/视频/文案/语音）',
  instruction: `你是一个电商需求分类专家。根据用户输入自动判断属于以下哪一类：

图片类: main_image(商品主图) | scene_image(场景图) | poster(营销海报) | detail_image(详情图)
详情页类: product_detail(商品详情页) | infographic(信息图)
视频类: main_video(主图视频) | ad_video(投流视频) | action_migrate(动作迁移) | video_clone(爆款复刻)
文案语音类: copywriting(营销文案) | script(带货脚本) | selling_points(卖点提炼) | voice(语音配音)

优先使用 classify_intent 工具进行快速分类。仅输出 JSON: {"intentId":"...","category":"...","confidence":0.0-1.0}`,
  model: 'qwen-turbo',
  tools: [classifyTool],
  outputKey: 'intent_result',
  generateContentConfig: { temperature: 0.1, maxOutputTokens: 200 },
});
