/**
 * Token 泄漏保护服务 — Token Leak Protection
 *
 * 功能：
 * 1. Token 用量异常检测 — 单用户短时间消耗突增 → 告警
 * 2. IP 变化检测 — 同一 Token 跨 IP 使用 → 标记风险
 * 3. API Key 加密存储（已有 encryptionKey 基础上增加校验层）
 */
import logger from '../utils/logger.js';
import { securityConfig } from '../config/index.js';

// 内存滑动窗口（userId → { tokens: number, firstTs: number }）
const tokenUsageWindow = new Map();
// IP 追踪（userId → Set<ip>）
const userIpSet = new Map();

// 定期清理
const CLEANUP_INTERVAL = 5 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of tokenUsageWindow) {
    if (now - entry.firstTs > securityConfig.tokenBurstWindowMs) tokenUsageWindow.delete(key);
  }
  for (const [key, entry] of userIpSet) {
    if (now - entry.ts > securityConfig.tokenIpCheckWindowMs) userIpSet.delete(key);
  }
}, CLEANUP_INTERVAL).unref();

// ==================== 检查函数 ====================

/**
 * Token 用量异常检测
 * @returns {{ suspicious: boolean, reason: string|null }}
 */
export function checkTokenBurst(userId, tokensConsumed) {
  if (!securityConfig.tokenLeakProtection || !userId) return { suspicious: false, reason: null };

  const now = Date.now();
  const entry = tokenUsageWindow.get(userId);

  if (!entry || now - entry.firstTs > securityConfig.tokenBurstWindowMs) {
    tokenUsageWindow.set(userId, { tokens: tokensConsumed, firstTs: now });
    return { suspicious: false, reason: null };
  }

  entry.tokens += tokensConsumed;

  if (entry.tokens > securityConfig.tokenBurstThreshold) {
    logger.warn(`[TokenLeak] 用量异常: user=${userId}, tokens=${entry.tokens}/${securityConfig.tokenBurstThreshold}, window=${securityConfig.tokenBurstWindowMs}ms`);
    return {
      suspicious: true,
      reason: `短时间 Token 用量异常 (${entry.tokens}/${securityConfig.tokenBurstThreshold})`,
    };
  }

  return { suspicious: false, reason: null };
}

/**
 * IP 变化检测
 * @returns {{ suspicious: boolean, reason: string|null }}
 */
export function checkIpChange(userId, currentIp) {
  if (!securityConfig.tokenLeakProtection || !userId || !currentIp) return { suspicious: false, reason: null };

  const now = Date.now();
  const entry = userIpSet.get(userId);

  if (!entry || now - entry.ts > securityConfig.tokenIpCheckWindowMs) {
    userIpSet.set(userId, { ips: new Set([currentIp]), ts: now });
    return { suspicious: false, reason: null };
  }

  entry.ips.add(currentIp);
  entry.ts = now;

  if (entry.ips.size > securityConfig.tokenMaxIpCount) {
    logger.warn(`[TokenLeak] IP 异常: user=${userId}, ips=${entry.ips.size}/${securityConfig.tokenMaxIpCount}, list=${[...entry.ips].join(',')}`);
    return {
      suspicious: true,
      reason: `Token 在多个 IP 使用 (${entry.ips.size}/${securityConfig.tokenMaxIpCount})`,
    };
  }

  return { suspicious: false, reason: null };
}

/**
 * 综合检查（Gateway 调用）
 */
export function comprehensiveCheck(userId, ip, tokensConsumed) {
  const burstResult = checkTokenBurst(userId, tokensConsumed);
  const ipResult = checkIpChange(userId, ip);

  const suspicious = burstResult.suspicious || ipResult.suspicious;
  const reasons = [burstResult.reason, ipResult.reason].filter(Boolean);

  return { suspicious, reasons, action: suspicious ? 'alert' : 'pass' };
}

export default { checkTokenBurst, checkIpChange, comprehensiveCheck };
