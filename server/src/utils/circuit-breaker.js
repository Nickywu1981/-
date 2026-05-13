/**
 * Movio AI v4.2 — Circuit Breaker (增强版)
 *
 * 增强功能：
 * - 错误率触发（不仅失败次数）
 * - 滑动窗口统计（errorRateThreshold + windowDuration）
 * - 半开恢复自动探测
 * - 三态: closed | open | half-open
 */
import logger from '../utils/logger.js';

export class CircuitBreaker {
  constructor(opts = {}) {
    this.failureThreshold = opts.failureThreshold || 5;
    this.cooldownMs = opts.cooldownMs || 60000;

    // 增强: 错误率模式
    this.useErrorRate = opts.useErrorRate !== false; // 默认启用
    this.errorRateThreshold = opts.errorRateThreshold || 0.5; // 50% 错误率触发
    this.windowDuration = opts.windowDuration || 120000; // 2分钟窗口
    this.minRequestsForRate = opts.minRequestsForRate || 10; // 最少请求数才计算错误率

    // 状态
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.state = 'closed';

    // 滑动窗口（错误率模式）
    this.window = []; // [{ success: boolean, ts: number }]
  }

  isAvailable() {
    if (this.state === 'closed') return true;
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.cooldownMs) {
        this.state = 'half-open';
        logger.info(`[CircuitBreaker] 半开探测 (cooldown=${this.cooldownMs}ms)`);
        return true;
      }
      return false;
    }
    return this.state === 'half-open';
  }

  recordSuccess() {
    // 错误率模式
    if (this.useErrorRate) {
      this._addWindowEntry(true);
    }

    if (this.state === 'half-open') {
      logger.info('[CircuitBreaker] 半开探测成功 → 恢复为关闭');
    }
    this.failureCount = 0;
    this.state = 'closed';
  }

  recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    // 错误率模式
    if (this.useErrorRate) {
      this._addWindowEntry(false);
    }

    let shouldOpen = false;

    if (this.useErrorRate && this.window.length >= this.minRequestsForRate) {
      const errors = this.window.filter(e => !e.success).length;
      const rate = errors / this.window.length;
      if (rate >= this.errorRateThreshold) {
        logger.warn(`[CircuitBreaker] 错误率熔断: ${(rate * 100).toFixed(0)}% (${errors}/${this.window.length}) >= ${(this.errorRateThreshold * 100).toFixed(0)}%`);
        shouldOpen = true;
      }
    }

    if (!shouldOpen && this.failureCount >= this.failureThreshold) {
      logger.warn(`[CircuitBreaker] 次数熔断: ${this.failureCount}/${this.failureThreshold}`);
      shouldOpen = true;
    }

    if (shouldOpen) {
      this.state = 'open';
      this.lastFailureTime = Date.now();
    }
  }

  _addWindowEntry(success) {
    const now = Date.now();
    this.window.push({ success, ts: now });
    // 清理过期条目
    const cutoff = now - this.windowDuration;
    while (this.window.length > 0 && this.window[0].ts < cutoff) {
      this.window.shift();
    }
  }

  getState() {
    return this.state;
  }

  /** 获取当前统计信息 */
  getStats() {
    if (!this.useErrorRate) {
      return {
        state: this.state,
        failureCount: this.failureCount,
        failureThreshold: this.failureThreshold,
        cooldownRemaining: this.state === 'open'
          ? Math.max(0, this.cooldownMs - (Date.now() - this.lastFailureTime))
          : 0,
      };
    }

    const errors = this.window.filter(e => !e.success).length;
    const rate = this.window.length > 0 ? errors / this.window.length : 0;
    return {
      state: this.state,
      windowSize: this.window.length,
      errorRate: rate,
      errorRateThreshold: this.errorRateThreshold,
      cooldownRemaining: this.state === 'open'
        ? Math.max(0, this.cooldownMs - (Date.now() - this.lastFailureTime))
        : 0,
    };
  }

  /** 强制重置 */
  reset() {
    this.failureCount = 0;
    this.state = 'half-open';
    this.window = [];
    logger.info('[CircuitBreaker] 已重置为半开状态');
  }

  /** 动态更新阈值（供自适应阈值引擎调用） */
  updateThresholds({ failureThreshold, cooldownMs, errorRateThreshold }) {
    if (failureThreshold !== undefined && failureThreshold > 0) {
      this.failureThreshold = failureThreshold;
    }
    if (cooldownMs !== undefined && cooldownMs > 0) {
      this.cooldownMs = cooldownMs;
    }
    if (errorRateThreshold !== undefined && errorRateThreshold > 0 && errorRateThreshold <= 1) {
      this.errorRateThreshold = errorRateThreshold;
    }
    logger.info('[CircuitBreaker] Thresholds updated', {
      failureThreshold: this.failureThreshold,
      cooldownMs: this.cooldownMs,
      errorRateThreshold: this.errorRateThreshold,
    });
  }
}

export default CircuitBreaker;
