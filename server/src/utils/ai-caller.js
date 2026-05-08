/**
 * Movio AI v4.1 — AI Caller Utility
 * G5 后端开发 | v4.1
 * 统一 AI 模型调用: 超时控制 + 重试 + 熔断器集成
 */
import { CircuitBreaker } from './circuit-breaker.js';

const DEFAULT_TIMEOUT = 120000;
const DEFAULT_RETRIES = 3;

/**
 * @param {string} endpoint - 模型 API 地址
 * @param {string} apiKey - API Key
 * @param {object} params - 调用参数 { prompt, model, ... }
 * @param {object} options - { timeoutMs, maxRetries, breaker, modelName }
 */
export async function call(endpoint, apiKey, params, options = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT, maxRetries = DEFAULT_RETRIES, breaker, modelName } = options;

  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(params),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`[${modelName || 'AI'}] HTTP ${response.status}: ${errorBody}`);
      }

      const result = await response.json();

      // 成功 → 重置熔断器
      if (breaker instanceof CircuitBreaker) {
        breaker.recordSuccess();
      }

      return result;
    } catch (err) {
      lastError = err;

      // 记录失败到熔断器
      if (breaker instanceof CircuitBreaker) {
        breaker.recordFailure();
      }

      // 最后一次尝试失败则抛出
      if (attempt >= maxRetries) {
        throw err;
      }

      // 指数退避: 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
    }
  }

  throw lastError;
}

export const aiCaller = { call };
