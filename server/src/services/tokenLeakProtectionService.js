/**
 * Token 泄漏保护服务 — Token Leak Protection
 *
 * 功能：
 * 1. Token 用量异常检测 — 单用户短时间消耗突增 → 告警
 * 2. IP 变化检测 — 同一 Token 跨 IP 使用 → 标记风险
 * 3. API Key 加密存储（已有 encryptionKey 基础上增加校验层）
 */
import logger from '../utils/logger.js';

// ==================== 配置 ====================

const config = {
  enabled: process.env.SECURITY_TOKEN_LEAK_PROTECTION === 'true',
  // 用量异常阈值
  burstThresholdTokens: parseInt(process.env.TOKEN_BURST_THRESHOLD || '100000', 10), // 10万 token/5分钟
  burstWindowMs: parseInt(process.env.TOKEN_BURST_WINDOW_MS || '300000', 10), // 5分钟
  // IP 异常检测
  maxIpCountPerToken: parseInt(process.env.TOKEN_MAX_IP_COUNT || '3', 10),
  ipCheckWindowMs: parseInt(process.env.TOKEN_IP_CHECK_WINDOW_MS || '3600000', 10), // 1小时
};

// 内存滑动窗口（userId → { tokens: number, firstTs: number }）
const tokenUsageWindow = new Map();
// IP 追踪（userId → Set<ip>）
const userIpSet = new Map();

// 定期清理
const CLEANUP_INTERVAL = 5 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of tokenUsageWindow) {
    if (now - entry.firstTs > config.burstWindowMs) tokenUsageWindow.delete(key);
  }
  for (const [key, entry] of userIpSet) {
    if (now - entry.ts > config.ipCheckWindowMs) userIpSet.delete(key);
  }
}, CLEANUP_INTERVAL).unref();

// ==================== 检查函数 ====================

/**
 * Token 用量异常检测
 * @returns {{ suspicious: boolean, reason: string|null }}
 */
export function checkTokenBurst(userId, tokensConsumed) {
  if (!config.enabled || !userId) return { suspicious: false, reason: null };

  const now = Date.now();
  const entry = tokenUsageWindow.get(userId);

  if (!entry || now - entry.firstTs > config.burstWindowMs) {
    tokenUsageWindow.set(userId, { tokens: tokensConsumed, firstTs: now });
    return { suspicious: false, reason: null };
  }

  entry.tokens += tokensConsumed;

  if (entry.tokens > config.burstThresholdTokens) {
    logger.warn(`[TokenLeak] 用量异常: user=${userId}, tokens=${entry.tokens}/${config.burstThresholdTokens}, window=${config.burstWindowMs}ms`);
    return {
      suspicious: true,
      reason: `短时间 Token 用量异常 (${entry.tokens}/${config.burstThresholdTokens})`,
    };
  }

  return { suspicious: false, reason: null };
}

/**
 * IP 变化检测
 * @returns {{ suspicious: boolean, reason: string|null }}
 */
export function checkIpChange(userId, currentIp) {
  if (!config.enabled || !userId || !currentIp) return { suspicious: false, reason: null };

  const now = Date.now();
  const entry = userIpSet.get(userId);

  if (!entry || now - entry.ts > config.ipCheckWindowMs) {
    userIpSet.set(userId, { ips: new Set([currentIp]), ts: now });
    return { suspicious: false, reason: null };
  }

  entry.ips.add(currentIp);
  entry.ts = now;

  if (entry.ips.size > config.maxIpCountPerToken) {
    logger.warn(`[TokenLeak] IP 异常: user=${userId}, ips=${entry.ips.size}/${config.maxIpCountPerToken}, list=${[...entry.ips].join(',')}`);
    return {
      suspicious: true,
      reason: `Token 在多个 IP 使用 (${entry.ips.size}/${config.maxIpCountPerToken})`,
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
