/**
 * ADK 共享工具 — AI Gateway LLM 调用辅助
 * 封装 gatewayRoute → parse JSON 回应 → 错误兜底
 *
 * 被 storyboardAgent / detailAgent / dispatchAgent 等多个 Agent 复用
 */
import logger from '../../../utils/logger.js';

/**
 * 调用 LLM (通过 gatewayRoute) 并自动解析 JSON 返回
 * @param {{ systemPrompt?: string, userPrompt: string, model?: string, temperature?: number, maxTokens?: number }} params
 * @returns {Promise<object>} 解析后的 JSON 对象
 */
export async function callLlmAndParseJson({
  systemPrompt = '',
  userPrompt,
  model = 'qwen-turbo',
  temperature = 0.3,
  maxTokens = 800,
}) {
  const { gatewayRoute } = await import('../../../gateway/aiGatewayHub.js');

  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: userPrompt });

  const result = await gatewayRoute({
    mode: 'single',
    taskType: 'text_gen',
    params: {
      model,
      messages,
      temperature,
      maxTokens,
    },
  });

  const raw = result?.output?.choices?.[0]?.message?.content || '';
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    logger.warn('[gateway-llm-call] No JSON found in LLM response', { raw: raw.slice(0, 200) });
    return null;
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    logger.warn('[gateway-llm-call] JSON parse failed', { error: e.message });
    return null;
  }
}
