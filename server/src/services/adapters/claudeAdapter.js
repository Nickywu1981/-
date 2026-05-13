/**
 * Anthropic Claude Adapter
 * 支持: Claude Sonnet 4.6 / Claude Haiku 4.5
 * 用途: 长文本分析、合规审核、复杂推理、安全审查
 */

import { registerModel } from '../aiEngine.js';
import { BusinessError } from '../../utils/businessError.js';
import { adapterConfig } from '../../config/index.js';
import logger from '../../utils/logger.js';

const API_KEY = adapterConfig.claude.apiKey;
const BASE_URL = adapterConfig.claude.baseUrl;
const ANTHROPIC_VERSION = '2023-06-01';

// ==================== Claude Sonnet 4.6 ====================

async function claudeSonnetInfer(input, onProgress) {
  const { prompt, systemPrompt, temperature = 0.7, maxTokens = 4096 } = input;

  onProgress?.(20);

  const body = {
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    temperature,
    messages: [{ role: 'user', content: prompt }],
  };
  if (systemPrompt) body.system = systemPrompt;

  onProgress?.(40);

  const res = await fetch(`${BASE_URL}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    logger.error(`[Claude] API 请求失败 ${res.status}: ${err.error?.message || res.statusText}`);
    throw new BusinessError(502, 'Claude AI 服务暂时不可用，请稍后重试');
  }

  onProgress?.(80);

  const data = await res.json();
  const text = data.content?.find((c) => c.type === 'text')?.text || '';

  onProgress?.(100);

  return {
    text,
    model: data.model,
    usage: data.usage ? { inputTokens: data.usage.input_tokens, outputTokens: data.usage.output_tokens, totalTokens: data.usage.input_tokens + data.usage.output_tokens } : null,
  };
}

// ==================== Claude Haiku 4.5 ====================

async function claudeHaikuInfer(input, onProgress) {
  onProgress?.(20);

  const { prompt, systemPrompt, temperature = 0.5, maxTokens = 2048 } = input;
  const body = {
    model: 'claude-haiku-4-5',
    max_tokens: maxTokens,
    temperature,
    messages: [{ role: 'user', content: prompt }],
  };
  if (systemPrompt) body.system = systemPrompt;

  onProgress?.(40);

  const res = await fetch(`${BASE_URL}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) throw new BusinessError(502, `Claude API 错误 ${res.status}`);

  onProgress?.(80);

  const data = await res.json();

  onProgress?.(100);

  return {
    text: data.content?.find((c) => c.type === 'text')?.text || '',
    model: data.model,
    usage: data.usage ? { inputTokens: data.usage.input_tokens, outputTokens: data.usage.output_tokens, totalTokens: data.usage.input_tokens + data.usage.output_tokens } : null,
  };
}

// ==================== 健康检查 ====================

async function health() {
  try {
    const res = await fetch(`${BASE_URL}/messages`, {
      method: 'POST',
      headers: { 'x-api-key': API_KEY, 'anthropic-version': ANTHROPIC_VERSION, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }),
      signal: AbortSignal.timeout(5000),
    });
    return { status: res.ok ? 'ok' : 'error', provider: 'anthropic' };
  } catch (err) {
    logger.error('[ClaudeAdapter] 健康检查失败', { error: err.message });
    return { status: 'unavailable', provider: 'anthropic' };
  }
}

// ==================== 注册模型 ====================

export function registerClaude() {
  if (!API_KEY) {
    logger.warn('[AI] CLAUDE_API_KEY 未配置，Claude 模型将使用降级模式');
  }

  registerModel({ id: 'claude-sonnet-4-6', type: 'text', infer: claudeSonnetInfer, health, provider: 'anthropic' });
  registerModel({ id: 'claude-haiku-4-5', type: 'text', infer: claudeHaikuInfer, health, provider: 'anthropic' });

  logger.info('[AI] Claude 模型已注册: claude-sonnet-4-6, claude-haiku-4-5');
}
