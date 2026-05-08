/**
 * Movio AI v4.1 — Circuit Breaker (熔断器)
 * G5 后端开发 | v4.1 新增
 * 连续失败 N 次 → 熔断 60s → 半开试探 → 恢复或重新熔断
 */
export class CircuitBreaker {
  constructor(opts = {}) {
    this.failureThreshold = opts.failureThreshold || 5;
    this.cooldownMs = opts.cooldownMs || 60000;
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.state = 'closed'; // closed | open | half-open
  }

  isAvailable() {
    if (this.state === 'closed') return true;
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.cooldownMs) {
        this.state = 'half-open';
        return true; // 半开允许试探
      }
      return false;
    }
    return this.state === 'half-open';
  }

  recordSuccess() {
    this.failureCount = 0;
    this.state = 'closed';
  }

  recordFailure() {
    this.failureCount++;
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';
      this.lastFailureTime = Date.now();
    }
  }

  getState() {
    return this.state;
  }
}
