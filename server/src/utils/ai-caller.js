/**
 * Movio AI v4.1 — AI Caller Utility
 * G5 后端开发 | v4.1
 * 统一 AI 模型调用: 超时控制 + 重试 + 熔断器集成
 */
import { CircuitBreaker } from './circuit-breaker.js';
import { BusinessError } from './businessError.js';
import { aiTimeoutMs } from '../config/index.js';
import logger from './logger.js';

const DEFAULT_TIMEOUT = aiTimeoutMs;
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
    // 熔断器检查（阻断请求而非仅记录）
    if (breaker instanceof CircuitBreaker && !breaker.isAvailable()) {
      throw new BusinessError(503, `[${modelName || 'AI'}] 熔断器已开启，请稍后重试`);
    }

    let timeout;
    try {
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), timeoutMs);

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
      try { controller.abort(); } catch { /* signal already aborted */ }

      if (!response.ok) {
        const errorBody = await response.text();
        logger.warn(`[${modelName || 'AI'}] upstream error`, { status: response.status, error: errorBody.substring(0, 200) });
        throw new BusinessError(502, 'AI 服务暂时不可用，请稍后重试');
      }

      const result = await response.json();

      // 成功 → 重置熔断器
      if (breaker instanceof CircuitBreaker) {
        breaker.recordSuccess();
      }

      return result;
    } catch (err) {
      if (timeout) clearTimeout(timeout);
      try { controller.abort(); } catch { /* signal already aborted */ }
      lastError = err;

      if (breaker instanceof CircuitBreaker) {
        breaker.recordFailure();
      }

      if (attempt >= maxRetries) {
        throw err;
      }

      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
    }
  }
}

export const aiCaller = { call };
