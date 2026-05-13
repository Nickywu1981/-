/**
 * 阿里云内容安全（绿网）对接服务
 *
 * 双通道策略：自建词库兜底 + 阿里云增强
 * API 文档: https://help.aliyun.com/document_detail/28417.html
 */
import crypto from 'crypto';
import logger from '../utils/logger.js';

// 阿里云 Green SDK（可选安装，未安装时降级为空操作）
let GreenSDK = null;
let greenClient = null;
let _sdkLoaded = false;

async function loadSDK() {
  if (_sdkLoaded) return;
  try {
    GreenSDK = await import('@alicloud/green-sdk').then(m => m.default || m).catch(() => null);
  } catch { /* SDK not installed */ }
  _sdkLoaded = true;
}

const config = {
  enabled: process.env.SECURITY_ALIYUN_GREEN_ENABLED === 'true',
  accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID || '',
  accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET || '',
  region: process.env.ALIYUN_GREEN_REGION || 'cn-shanghai',
  timeout: parseInt(process.env.ALIYUN_GREEN_TIMEOUT_MS || '5000', 10),
};

async function getClient() {
  await loadSDK();
  if (!config.enabled || !config.accessKeyId) return null;
  if (!greenClient && GreenSDK) {
    try {
      greenClient = new GreenSDK({
        accessKeyId: config.accessKeyId,
        accessKeySecret: config.accessKeySecret,
        regionId: config.region,
      });
      logger.info('[AliyunGreen] 客户端已初始化');
    } catch (e) {
      logger.error(`[AliyunGreen] 客户端初始化失败: ${e.message}`);
    }
  }
  return greenClient;
}

/**
 * 同步文本检测 — 调用阿里云 textScan API
 * @param {string} text - 待检测文本（限制 10000 字符）
 * @returns {{ passed: boolean, riskLevel: string, violations: Array, suggestion: string }}
 */
export async function textScan(text) {
  if (!text || typeof text !== 'string') return { passed: true, riskLevel: 'safe', violations: [], suggestion: 'pass' };

  const client = getClient();
  if (!client) {
    logger.warn('[AliyunGreen] 未启用或未配置，跳过检测');
    return { passed: true, riskLevel: 'safe', violations: [], suggestion: 'pass' };
  }

  const truncated = text.slice(0, 10000);

  try {
    const task = {
      scenes: ['antispam'],
      tasks: [{
        dataId: crypto.randomUUID(),
        content: truncated,
      }],
    };

    const result = await Promise.race([
      client.textScan(task),
      new Promise((_, reject) => setTimeout(() => reject(new Error('检测超时')), config.timeout)),
    ]);

    const taskResult = result?.data?.[0];
    if (!taskResult) {
      logger.warn('[AliyunGreen] 返回结果为空');
      return { passed: true, riskLevel: 'safe', violations: [], suggestion: 'pass' };
    }

    const violations = [];
    const results = taskResult.results || [];
    for (const r of results) {
      if (r.suggestion === 'block' || r.suggestion === 'review') {
        violations.push({
          label: r.label,
          rate: r.rate,
          suggestion: r.suggestion,
          details: r.details || {},
        });
      }
    }

    const passed = violations.length === 0;
    const riskLevel = passed ? 'safe' : taskResult.suggestion === 'block' ? 'high' : 'medium';

    logger.info(`[AliyunGreen] 文本检测完成: passed=${passed}, violations=${violations.length}`);

    return {
      passed,
      riskLevel,
      violations,
      suggestion: passed ? 'pass' : taskResult.suggestion || 'review',
    };
  } catch (e) {
    logger.error(`[AliyunGreen] 文本检测异常: ${e.message}`);
    return { passed: true, riskLevel: 'safe', violations: [], suggestion: 'pass' };
  }
}

/**
 * 双通道检测 — 自建词库 + 阿里云绿网
 * @param {string} text
 * @param {object} selfCheckResult - 自建词库检查结果 { hits: Array }
 * @returns {{ passed: boolean, riskLevel: string, action: string, violations: Array }}
 */
export async function dualChannelCheck(text, selfCheckResult = { hits: [] }) {
  const violations = [];

  // 通道1: 自建词库结果
  if (selfCheckResult.hits && selfCheckResult.hits.length > 0) {
    for (const h of selfCheckResult.hits) {
      violations.push({
        source: 'self_built',
        word: h.word || h,
        category: h.category || 'unknown',
        level: h.level || 1,
      });
    }
  }

  // 通道2: 阿里云绿网（非阻塞，自建已拦截则跳过）
  if (violations.length === 0 && config.enabled) {
    try {
      const aliResult = await textScan(text);
      if (!aliResult.passed) {
        violations.push(
          ...aliResult.violations.map(v => ({ source: 'aliyun_green', ...v })),
        );
      }
    } catch (e) {
      logger.warn(`[DualChannel] 阿里云检测失败: ${e.message}`);
    }
  }

  const passed = violations.length === 0;
  const riskLevel = violations.length === 0 ? 'safe'
    : violations.length <= 2 ? 'low'
    : violations.length <= 5 ? 'medium'
    : 'high';

  const action = passed ? 'pass'
    : violations.some(v => v.level === 1 || v.suggestion === 'block') ? 'block'
    : 'review';

  return { passed, riskLevel, action, violations };
}

export default { textScan, dualChannelCheck };
