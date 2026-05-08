/**
 * Movio AI v4.1 — Prompt Enhance Service (统一提示词增强引擎)
 * G5 后端开发 | W2
 *
 * 五个提示词润色场景合并为一个通用服务:
 *   视频/图片/详情图/海报/社媒 — 通过 prompt_type 切换 System Prompt
 *   底层共用通义千问 LLM, 不同场景仅 System Prompt 不同
 */
import { routeModel } from './model-router.service.js';

const PROMPT_STRATEGIES = {
  image: {
    system: '你是一位专业的电商视觉设计师。请优化以下图片生成提示词，使其更加详细和专业。要求: 1)明确商品主体 2)描述拍摄角度和构图 3)指定光线和氛围 4)给出风格建议。仅输出优化后的提示词，不加解释。',
    max_tokens: 300,
  },
  video: {
    system: '你是一位短视频创作专家。请优化以下视频提示词，考虑: 1)视频节奏和转场 2)BGM风格匹配 3)字幕样式建议 4)开头3秒吸引力。仅输出优化后的提示词，不加解释。',
    max_tokens: 300,
  },
  detail: {
    system: '你是一位电商详情页设计师。请优化以下详情图提示词，关注: 1)产品卖点可视化 2)规格参数展示 3)使用场景展示 4)对比效果。仅输出优化后的提示词，不加解释。',
    max_tokens: 300,
  },
  poster: {
    system: '你是一位营销海报设计师。请优化以下海报提示词，关注: 1)视觉冲击力 2)文案层次 3)行动号召 4)品牌调性。仅输出优化后的提示词，不加解释。',
    max_tokens: 300,
  },
  social: {
    system: '你是一位社交媒体运营专家。请优化以下社媒封面提示词，关注: 1)平台调性匹配 2)吸引点击 3)文字排版 4)色彩搭配。仅输出优化后的提示词，不加解释。',
    max_tokens: 300,
  },
};

/**
 * 增强提示词
 * @param {string} prompt - 用户原始输入
 * @param {string} type - image/video/detail/poster/social
 * @returns {object} { original_prompt, enhanced_prompt, type }
 */
export async function enhancePrompt(prompt, type = 'image') {
  const strategy = PROMPT_STRATEGIES[type] || PROMPT_STRATEGIES.image;

  try {
    const result = await routeModel({
      mode: 'mixed',
      taskType: 'text_gen',
      params: {
        model: 'qwen-turbo',
        messages: [
          { role: 'system', content: strategy.system },
          { role: 'user', content: prompt },
        ],
        max_tokens: strategy.max_tokens,
        temperature: 0.7,
      },
    });

    // 从千问响应中提取增强后的文本
    const enhancedPrompt = result?.choices?.[0]?.message?.content || result?.output?.text || prompt;

    return {
      original_prompt: prompt,
      enhanced_prompt: enhancedPrompt.trim(),
      type,
    };
  } catch (err) {
    // 降级: 返回原提示词
    console.warn('[PromptEnhance] 增强失败，降级返回原始提示词', err.message);
    return {
      original_prompt: prompt,
      enhanced_prompt: prompt,
      type,
      degraded: true,
    };
  }
}

export { PROMPT_STRATEGIES };
