/**
 * OpenAI-compatible Adapter（通用 OpenAI 协议适配器）
 * 对接任意 OpenAI 兼容代理，自动拉取可用模型列表并按需注册
 */

import { registerModel } from '../aiEngine.js';
import { BusinessError } from '../../utils/businessError.js';
import { adapterConfig } from '../../config/index.js';
import logger from '../../utils/logger.js';
import { ERROR_CODE } from '../../constants/errorCode.js';

const API_KEY = adapterConfig.openai.apiKey;
const BASE_URL = adapterConfig.openai.baseUrl;
const DEFAULTS = adapterConfig.defaults;

// ==================== 通用文本推断工厂 ====================

function makeTextInfer(modelId, maxTokens = DEFAULTS.textMaxTokens, timeout = DEFAULTS.textTimeoutMs) {
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
      logger.error(`[OpenAI] API 请求失败 ${res.status}: ${err.error?.message || res.statusText}`);
      throw new BusinessError(ERROR_CODE.INTERNAL_ERROR);
    }

    onProgress?.(80);

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';

    onProgress?.(100);

    return {
      text: content,
      model: data.model || modelId,
      usage: data.usage
        ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens, totalTokens: data.usage.total_tokens }
        : null,
    };
  };
}

// ==================== 通用文本流式推断工厂 ====================

function makeTextStreamInfer(modelId, maxTokens = DEFAULTS.textMaxTokens, timeout = DEFAULTS.textStreamTimeoutMs) {
  let malformedChunksDiscarded = 0;
  let totalChunksReceived = 0;

  return async function* streamInfer(input, onProgress) {
    if (typeof input === 'string') {
      input = { prompt: input };
    }
    const { prompt, systemPrompt, temperature = 0.7, maxTokens: mt = maxTokens } = input;

    const messages = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });

    onProgress?.(10);

    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({ model: modelId, messages, temperature, max_tokens: mt, stream: true }),
      signal: AbortSignal.timeout(timeout),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      logger.error(`[OpenAI] Stream API 请求失败 ${res.status}: ${err.error?.message || res.statusText}`);
      throw new BusinessError(ERROR_CODE.INTERNAL_ERROR);
    }

    onProgress?.(30);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    let inputTokens = 0;
    let outputTokens = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') break;

          totalChunksReceived++;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta;
            if (delta?.content) {
              yield { text: delta.content };
            }
            if (json.usage) {
              inputTokens = json.usage.prompt_tokens || inputTokens;
              outputTokens = json.usage.completion_tokens || outputTokens;
            }
          } catch {
            malformedChunksDiscarded++;
          }
        }
      }
    } finally {
      reader.releaseLock();
      if (malformedChunksDiscarded > 0) {
        logger.error('[OpenAI] SSE 流中丢弃畸形 chunk', {
          model: modelId,
          discarded: malformedChunksDiscarded,
          total: totalChunksReceived,
          discardRate: totalChunksReceived > 0
            ? `${((malformedChunksDiscarded / totalChunksReceived) * 100).toFixed(1)}%`
            : 'N/A',
        });
      }
    }

    onProgress?.(100);

    // 最后 yield 用量信息 + 监控指标
    yield {
      usage: { inputTokens, outputTokens },
      _meta: { malformedChunksDiscarded, totalChunksReceived },
    };
  };
}

// ==================== 远程模型列表拉取 ====================

async function fetchRemoteModels() {
  try {
    const res = await fetch(`${BASE_URL}/models`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
      signal: AbortSignal.timeout(DEFAULTS.modelListTimeoutMs),
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch {
    logger.error('[AI] 远程模型列表拉取失败');
    return [];
  }
}

// ==================== 健康检查 ====================

async function health() {
  try {
    const res = await fetch(`${BASE_URL}/models`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
      signal: AbortSignal.timeout(DEFAULTS.healthTimeoutMs),
    });
    return { status: res.ok ? 'ok' : 'error', provider: 'openai' };
  } catch {
    logger.error('[AI] OpenAI 健康检查失败');
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
    logger.error(`[OpenAI] Embedding API 请求失败 ${res.status}: ${err.error?.message || res.statusText}`);
    throw new BusinessError(ERROR_CODE.INTERNAL_ERROR);
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
        streamInfer: makeTextStreamInfer(id, cap.maxTokens, cap.timeout),
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
    const cap = MODEL_CAPABILITIES[id] || { maxTokens: DEFAULTS.textMaxTokens, timeout: DEFAULTS.textTimeoutMs };

    registerModel({
      id,
      type: 'text',
      infer: makeTextInfer(id, cap.maxTokens, cap.timeout),
        streamInfer: makeTextStreamInfer(id, cap.maxTokens, cap.timeout),
      health,
      provider: 'openai',
    });
    logger.info(`[AI] 模型已注册: ${id} (text)`);
    count++;
  }

  logger.info(`[AI] OpenAI 模型已注册: ${count} 个`);
}
