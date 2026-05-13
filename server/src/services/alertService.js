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
    name: '\u8c03\u7528\u6210\u529f\u7387\u8fc7\u4f4e',
    check: (stats) => stats.successRate < 80,
    message: (stats) => `AI \u8c03\u7528\u6210\u529f\u7387\u4f4e\u4e8e 80%: \u5f53\u524d ${stats.successRate}%`,
    cooldownMs: 5 * 60 * 1000,
    action: async () => {
      const { runRecoveryCycle } = await import('./autoRecoveryService.js');
      await runRecoveryCycle();
    },
  },
  {
    id: 'latency_high',
    name: '\u5e73\u5747\u54cd\u5e94\u5ef6\u8fdf\u8fc7\u9ad8',
    check: (stats) => stats.avgLatencyMs > 30000,
    message: (stats) => `AI \u5e73\u5747\u54cd\u5e94\u5ef6\u8fdf\u8d85\u8fc7 30s: \u5f53\u524d ${(stats.avgLatencyMs / 1000).toFixed(1)}s`,
    cooldownMs: 3 * 60 * 1000,
    action: async () => {
      const { runRecoveryCycle } = await import('./autoRecoveryService.js');
      await runRecoveryCycle();
    },
  },
  {
    id: 'error_rate_spike',
    name: '\u9519\u8bef\u7387\u7a81\u589e',
    check: (stats) => stats.calls > 10 && (100 - stats.successRate) > 30,
    message: (stats) => `\u9519\u8bef\u7387\u7a81\u589e\u81f3 ${(100 - stats.successRate).toFixed(1)}%\uff0c\u6700\u8fd1 ${stats.period} \u5171 ${stats.calls} \u6b21\u8c03\u7528`,
    cooldownMs: 5 * 60 * 1000,
    action: async () => {
      const { runRecoveryCycle } = await import('./autoRecoveryService.js');
      await runRecoveryCycle();
    },
  },
  {
    id: 'circuit_breaker_frequent',
    name: '\u9891\u7e41\u7194\u65ad',
    check: (stats) => stats.circuitBreakerTrips > 10,
    message: (stats) => `\u7194\u65ad\u5668 ${stats.period} \u5185\u89e6\u53d1 ${stats.circuitBreakerTrips} \u6b21\uff0c\u6a21\u578b\u53ef\u80fd\u4e0d\u7a33\u5b9a`,
    cooldownMs: 10 * 60 * 1000,
    action: async (stats) => {
      try {
        const { getModelBreaker } = await import('../gateway/gatewayCore.js');
        const { getPool, updateModel } = await import('./modelPoolService.js');
        const pool = await getPool();
        for (const model of pool) {
          const breaker = getModelBreaker(model.model_key);
          if (breaker && breaker.getState() === 'open' && model.pool_weight > 1) {
            await updateModel(model.model_key, { pool_weight: Math.max(1, Math.floor(model.pool_weight * 0.7)) });
            logger.warn('[Alert] Frequent breaker: reduced weight', { modelKey: model.model_key, newWeight: Math.max(1, Math.floor(model.pool_weight * 0.7)) });
          }
        }
      } catch (e) { logger.warn('[Alert] breaker_frequent action failed', { error: e.message }); }
    },
  },
  {
    id: 'rate_limit_high',
    name: '\u9650\u6d41\u62e6\u622a\u7387\u9ad8',
    check: (stats) => stats.rateLimitBlocks > 50,
    message: (stats) => `\u9650\u6d41\u62e6\u622a ${stats.period} \u5185 ${stats.rateLimitBlocks} \u6b21\uff0c\u5efa\u8bae\u6269\u5bb9\u914d\u989d`,
    cooldownMs: 10 * 60 * 1000,
    action: async () => {
      const { runRecoveryCycle } = await import('./autoRecoveryService.js');
      await runRecoveryCycle();
    },
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
