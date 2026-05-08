/**
 * OpenAI GPT Adapter
 * 支持: GPT-4o / GPT-4o-mini / DALL-E 3
 * 用途: 文案生成、脚本创作、标题优化、内容分析、翻译
 */

import { registerModel } from '../aiEngine.js';

const API_KEY = process.env.OPENAI_API_KEY || '';
const BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

// ==================== GPT-4o 文本生成 ====================

async function gpt4oInfer(input, onProgress) {
  const { prompt, systemPrompt, temperature = 0.7, maxTokens = 2000, responseFormat } = input;

  onProgress?.(20);

  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });

  const body = {
    model: 'gpt-4o',
    messages,
    temperature,
    max_tokens: maxTokens,
  };
  if (responseFormat === 'json') body.response_format = { type: 'json_object' };

  onProgress?.(40);

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`OpenAI API 错误 ${res.status}: ${err.error?.message || res.statusText}`);
  }

  onProgress?.(80);

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '';

  onProgress?.(100);

  return {
    text: content,
    model: data.model,
    usage: data.usage ? { promptTokens: data.usage.prompt_tokens, completionTokens: data.usage.completion_tokens, totalTokens: data.usage.total_tokens } : null,
  };
}

// ==================== GPT-4o-mini 文本生成 ====================

async function gpt4oMiniInfer(input, onProgress) {
  onProgress?.(20);

  const { prompt, systemPrompt, temperature = 0.7, maxTokens = 1000 } = input;
  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });

  onProgress?.(40);

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages, temperature, max_tokens: maxTokens }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) throw new Error(`OpenAI API 错误 ${res.status}`);

  onProgress?.(80);

  const data = await res.json();

  onProgress?.(100);

  return {
    text: data.choices?.[0]?.message?.content || '',
    model: data.model,
    usage: data.usage ? { totalTokens: data.usage.total_tokens } : null,
  };
}

// ==================== DALL-E 3 图片生成 ====================

async function dalle3Infer(input, onProgress) {
  const { prompt, size = '1024x1024', quality = 'standard', style = 'vivid' } = input;

  onProgress?.(30);

  const res = await fetch(`${BASE_URL}/images/generations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({ model: 'dall-e-3', prompt, n: 1, size, quality, style }),
    signal: AbortSignal.timeout(120000),
  });

  if (!res.ok) throw new Error(`DALL-E API 错误 ${res.status}`);

  onProgress?.(70);

  const data = await res.json();

  onProgress?.(100);

  return {
    imageUrl: data.data?.[0]?.url || '',
    revisedPrompt: data.data?.[0]?.revised_prompt || prompt,
    model: 'dall-e-3',
  };
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

// ==================== 注册模型 ====================

export function registerOpenAI() {
  if (!API_KEY) {
    console.warn('[AI] OPENAI_API_KEY 未配置，OpenAI 模型将使用降级模式');
  }

  registerModel({ id: 'gpt-4o', type: 'text', infer: gpt4oInfer, health, provider: 'openai' });
  registerModel({ id: 'gpt-4o-mini', type: 'text', infer: gpt4oMiniInfer, health, provider: 'openai' });
  registerModel({ id: 'dall-e-3', type: 'image', infer: dalle3Infer, health, provider: 'openai' });

  console.log('[AI] OpenAI 模型已注册: gpt-4o, gpt-4o-mini, dall-e-3');
}
