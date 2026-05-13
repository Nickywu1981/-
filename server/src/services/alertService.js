/**
 * 告警服务 — Alert Service
 *
 * 告警规则引擎，在关键指标异常时触发通知
 * 通知方式: 日志(log) / 回调(callback) / Webhook(预留)
 */
import logger from '../utils/logger.js';

// ==================== 告警规则定义 ====================

const DEFAULT_RULES = [
  {
    id: 'success_rate_low',
    name: '调用成功率过低',
    check: (stats) => stats.successRate < 80,
    message: (stats) => `AI 调用成功率低于 80%: 当前 ${stats.successRate}%`,
    cooldownMs: 5 * 60 * 1000, // 5分钟冷却
  },
  {
    id: 'latency_high',
    name: '平均响应延迟过高',
    check: (stats) => stats.avgLatencyMs > 30000, // 30秒
    message: (stats) => `AI 平均响应延迟超过 30s: 当前 ${(stats.avgLatencyMs / 1000).toFixed(1)}s`,
    cooldownMs: 3 * 60 * 1000,
  },
  {
    id: 'error_rate_spike',
    name: '错误率突增',
    check: (stats) => stats.calls > 10 && (100 - stats.successRate) > 30, // 错误率 > 30%
    message: (stats) => `错误率突增至 ${(100 - stats.successRate).toFixed(1)}%，最近 ${stats.period} 共 ${stats.calls} 次调用`,
    cooldownMs: 5 * 60 * 1000,
  },
  {
    id: 'circuit_breaker_frequent',
    name: '频繁熔断',
    check: (stats) => stats.circuitBreakerTrips > 10,
    message: (stats) => `熔断器 ${stats.period} 内触发 ${stats.circuitBreakerTrips} 次，模型可能不稳定`,
    cooldownMs: 10 * 60 * 1000,
  },
  {
    id: 'rate_limit_high',
    name: '限流拦截率高',
    check: (stats) => stats.rateLimitBlocks > 50,
    message: (stats) => `限流拦截 ${stats.period} 内 ${stats.rateLimitBlocks} 次，建议扩容配额`,
    cooldownMs: 10 * 60 * 1000,
  },
];

// ==================== 通知渠道 ====================

const notifiers = {
  log: (rule, message) => {
    logger.warn(`[Alert] ${rule.name}: ${message}`);
  },
  callback: null, // 用户可注册自定义回调
};

export function registerNotifier(type, fn) {
  if (type === 'callback') {
    notifiers.callback = fn;
    logger.info('[Alert] 自定义通知回调已注册');
  }
}

// ==================== 冷却管理 ====================

const alertCooldowns = new Map();

function isInCooldown(ruleId, cooldownMs) {
  const lastFired = alertCooldowns.get(ruleId);
  if (lastFired && Date.now() - lastFired < cooldownMs) return true;
  alertCooldowns.set(ruleId, Date.now());
  return false;
}

// ==================== 检查入口 ====================

/**
 * 根据当前指标运行所有告警规则
 * @param {object} stats — getDashboardSummary() 返回的数据
 * @returns {Array<{ ruleId: string, fired: boolean, message?: string }>}
 */
export function checkAlerts(stats) {
  const results = [];

  for (const rule of DEFAULT_RULES) {
    try {
      if (rule.check(stats) && !isInCooldown(rule.id, rule.cooldownMs)) {
        const message = rule.message(stats);
        results.push({ ruleId: rule.id, fired: true, message });

        // 通知
        notifiers.log(rule, message);
        if (notifiers.callback) {
          notifiers.callback(rule, message).catch(e => logger.warn(`[Alert] callback failed: ${e.message}`));
        }
      } else {
        results.push({ ruleId: rule.id, fired: false });
      }
    } catch (e) {
      logger.warn(`[Alert] 规则 ${rule.id} 检查异常: ${e.message}`);
    }
  }

  return results;
}

/**
 * 获取当前告警规则列表
 */
export function getAlertRules() {
  return DEFAULT_RULES.map(r => ({
    id: r.id,
    name: r.name,
    cooldownMs: r.cooldownMs,
    lastFired: alertCooldowns.get(r.id) || null,
  }));
}

export default { checkAlerts, getAlertRules, registerNotifier };
