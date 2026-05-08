/**
 * OpenAI-compatible Adapter（通用 OpenAI 协议适配器）
 * 对接任意 OpenAI 兼容代理，自动拉取可用模型列表并按需注册
 */

import { registerModel } from '../aiEngine.js';
import { BusinessError } from '../../utils/businessError.js';
import logger from '../../utils/logger.js';

const API_KEY = process.env.OPENAI_API_KEY || '';
const BASE_URL = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');

// ==================== 通用文本推断工厂 ====================

function makeTextInfer(modelId, maxTokens = 2000, timeout = 60000) {
  return async function infer(input, onProgress) {
    // 兼容字符串输入：自动包装为 { prompt }
    if (typeof input === 'string') {
      input = { prompt: input };
    }
    const { prompt, systemPrompt, temperature = 0.7, maxTokens: mt = maxTokens, responseFormat } = input;

    onProgress?.(20);

    const messages = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });

    const body = { model: modelId, messages, temperature, max_tokens: mt, stream: false };
    if (responseFormat === 'json') body.response_format = { type: 'json_object' };

    onProgress?.(40);

    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new BusinessError(502, `HTTP ${res.status}: ${err.error?.message || res.statusText}`);
    }

    onProgress?.(80);

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';

    onProgress?.(100);

    return {
      text: content,
      model: data.model || modelId,
      usage: data.usage
        ? { promptTokens: data.usage.prompt_tokens, completionTokens: data.usage.completion_tokens, totalTokens: data.usage.total_tokens }
        : null,
    };
  };
}

// ==================== 远程模型列表拉取 ====================

async function fetchRemoteModels() {
  try {
    const res = await fetch(`${BASE_URL}/models`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch {
    return [];
  }
}

// ==================== 健康检查 ====================

async function health() {
  try {
    const res = await fetch(`${BASE_URL}/models`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
      signal: AbortSignal.timeout(5000),
    });
    return { status: res.ok ? 'ok' : 'error', provider: 'openai' };
  } catch {
    return { status: 'unavailable', provider: 'openai' };
  }
}

// ==================== Embedding ====================

export async function getEmbedding(text, modelId = 'text-embedding-3-small') {
  if (!API_KEY) throw new BusinessError(503, 'OPENAI_API_KEY not configured');

  const input = Array.isArray(text) ? text : [text];

  const res = await fetch(`${BASE_URL}/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({ model: modelId, input }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new BusinessError(502, `Embedding API ${res.status}: ${err.error?.message || res.statusText}`);
  }

  const data = await res.json();
  const vectors = data.data.map(d => d.embedding);
  return Array.isArray(text) ? vectors : vectors[0];
}

// ==================== 模型能力映射 ====================

const MODEL_CAPABILITIES = {
  // 文本大模型 — 最长上下文 + 最高质量
  'gpt-5.5': { maxTokens: 8000, timeout: 120000 },
  'claude-opus-4-7': { maxTokens: 8000, timeout: 120000 },
  'deepseek-v4-pro': { maxTokens: 4000, timeout: 90000 },
  'deepseek-v4-flash': { maxTokens: 2000, timeout: 30000 },
};

// ==================== 注册 ====================

export async function registerOpenAI() {
  if (!API_KEY) {
    logger.warn('[AI] OPENAI_API_KEY 未配置，模型将使用降级模式');
    return;
  }

  logger.info('[AI] 拉取远程模型列表...');
  const remoteModels = await fetchRemoteModels();
  const remoteIds = new Set(remoteModels.map((m) => m.id));

  if (remoteIds.size === 0) {
    // 代理不可达 → 回退用静态配置
    logger.warn('[AI] 无法拉取远程模型列表，使用静态配置');
    for (const [id, cap] of Object.entries(MODEL_CAPABILITIES)) {
      registerModel({
        id,
        type: 'text',
        infer: makeTextInfer(id, cap.maxTokens, cap.timeout),
        health,
        provider: 'openai',
      });
      logger.info(`[AI] 模型已注册: ${id} (text, static)`);
    }
    return;
  }

  let count = 0;
  for (const rm of remoteModels) {
    const id = rm.id;
    const cap = MODEL_CAPABILITIES[id] || { maxTokens: 2000, timeout: 60000 };

    registerModel({
      id,
      type: 'text',
      infer: makeTextInfer(id, cap.maxTokens, cap.timeout),
      health,
      provider: 'openai',
    });
    logger.info(`[AI] 模型已注册: ${id} (text)`);
    count++;
  }

  logger.info(`[AI] OpenAI 模型已注册: ${count} 个`);
}
