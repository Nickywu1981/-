/**
 * Token Metering Service — 跨适配器 Token 用量归一化
 *
 * 不同 AI 适配器返回的 usage 字段命名不同：
 * - OpenAI:   { promptTokens, completionTokens, totalTokens }
 * - Claude:   { inputTokens, outputTokens }
 * - ModelRouter: { input_tokens, output_tokens }   (raw API response)
 * - SD/Stability/TTS: 无 usage 对象（图片/音频模型）
 *
 * 本服务统一提取为 { tokensIn, tokensOut }
 */
import logger from '../utils/logger.js';

const METER_CACHE = new Map();  // adapter output signature → extraction strategy
const MAX_CACHE = 50;

/**
 * 从适配器输出中提取归一化的 Token 用量
 * @param {object} adapterOutput - 适配器 infer() 返回的原始 output 对象
 * @returns {{ tokensIn: number, tokensOut: number }}
 */
export function extractUsage(adapterOutput) {
  if (!adapterOutput || typeof adapterOutput !== 'object') return { tokensIn: 0, tokensOut: 0 };

  // Cache key based on the keys present in the output object
  const keys = Object.keys(adapterOutput).sort().join(',');
  if (METER_CACHE.has(keys)) {
    return METER_CACHE.get(keys)(adapterOutput);
  }

  const extractor = buildExtractor(adapterOutput);
  METER_CACHE.set(keys, extractor);
  if (METER_CACHE.size > MAX_CACHE) {
    const first = METER_CACHE.keys().next().value;
    METER_CACHE.delete(first);
  }

  return extractor(adapterOutput);
}

function buildExtractor(output) {
  // 优先检查 usage 对象
  if (output.usage && typeof output.usage === 'object') {
    const u = output.usage;

    // OpenAI 格式: { promptTokens, completionTokens }
    if ('promptTokens' in u || 'completionTokens' in u) {
      return (o) => ({
        tokensIn: o.usage?.promptTokens || 0,
        tokensOut: o.usage?.completionTokens || 0,
      });
    }

    // Claude 格式: { inputTokens, outputTokens }
    if ('inputTokens' in u || 'outputTokens' in u) {
      return (o) => ({
        tokensIn: o.usage?.inputTokens || 0,
        tokensOut: o.usage?.outputTokens || 0,
      });
    }

    // 通用下划线格式: { input_tokens, output_tokens } (model-router)
    if ('input_tokens' in u || 'output_tokens' in u) {
      return (o) => ({
        tokensIn: o.usage?.input_tokens || o.usage?.prompt_tokens || 0,
        tokensOut: o.usage?.output_tokens || o.usage?.completion_tokens || 0,
      });
    }

    // total_tokens only (粗略估算)
    if ('total_tokens' in u) {
      return (o) => {
        const total = o.usage?.total_tokens || 0;
        return { tokensIn: Math.round(total * 0.3), tokensOut: Math.round(total * 0.7) };
      };
    }
  }

  // 顶层下划线格式 (raw API JSON 直接返回)
  if ('input_tokens' in output && 'output_tokens' in output) {
    return (o) => ({ tokensIn: o.input_tokens || 0, tokensOut: o.output_tokens || 0 });
  }

  // 顶层 prompt_tokens / completion_tokens
  if ('prompt_tokens' in output || 'completion_tokens' in output) {
    return (o) => ({ tokensIn: o.prompt_tokens || 0, tokensOut: o.completion_tokens || 0 });
  }

  // 无 Token 字段 — 图片/音频模型
  return () => ({ tokensIn: 0, tokensOut: 0 });
}

/**
 * 根据模型 category 推断 Token 等效值（用于非 Token 模型）
 * - image: 图片按 1 张 = 1000 token 等效
 * - video: 视频按 1 秒 = 5000 token 等效
 * - audio: 音频按 1 秒 = 100 token 等效
 */
export function estimateTokens(category, usage) {
  const extracted = extractUsage(usage);
  if (extracted.tokensIn > 0 || extracted.tokensOut > 0) return extracted;

  // 非 Token 模型的等效估算
  if (category === 'image') return { tokensIn: 1000, tokensOut: 0 };
  if (category === 'video') return { tokensIn: 5000, tokensOut: 0 };
  if (category === 'audio') return { tokensIn: 0, tokensOut: 100 };

  return { tokensIn: 0, tokensOut: 0 };
}

export function clearMeterCache() {
  METER_CACHE.clear();
  logger.info('[TokenMeter] 计量缓存已清除');
}
