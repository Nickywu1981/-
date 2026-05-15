/**
 * ADK 共享工具 — 卖点生成（唯一版本）
 *
 * contentAgent 和 detailAgent 各有一份 generate_selling_points 实现。
 * 此为统一版本 — detailAgent 的 LLM 驱动实现（更灵活），
 * 合并后供两个 Agent 共享。
 */
import { callLlmAndParseJson } from '../ai/gateway-llm-call.js';

/**
 * 通过 LLM 生成商品卖点文案
 * @param {{ productName: string, platform?: string, count?: number }} params
 * @returns {Promise<{sellingPoints: string[]}>}
 */
export async function generateSellingPoints({ productName, platform = 'taobao', count = 5 }) {
  const userPrompt = `你是一个电商文案专家。为以下商品生成${count}条核心卖点文案：

商品名称: ${productName}
目标平台: ${platform}
语言: zh-CN

要求:
- 每条卖点简洁有力（15-30字）
- 突出产品核心优势
- 符合平台风格
- 避免夸大和违禁词

返回JSON格式: { "sellingPoints": ["卖点1", "卖点2", ...] }`;

  const result = await callLlmAndParseJson({
    userPrompt,
    model: 'qwen-turbo',
    temperature: 0.7,
    maxTokens: 500,
  });

  return result || { sellingPoints: [] };
}
