/**
 * Gateway — 健康仪表盘
 *
 * 提供网关层组件的健康状态聚合展示。
 * - 数据库连接池状态
 * - Redis 连接状态
 * - AI 模型健康状态
 * - 限流器配置摘要
 * - BullMQ 队列统计
 */

const RATE_LIMITER_REGISTRY = [
  { name: 'apiLimiter',    tier: 'global',  description: '全局API限流 (200/min)' },
  { name: 'authLimiter',   tier: 'strict',  description: '认证限流 (10/min)' },
  { name: 'codeLimiter',   tier: 'strict',  description: '验证码限流 (1/min)' },
  { name: 'verifyLimiter', tier: 'normal',  description: '验证校验限流 (5/min)' },
  { name: 'heavyLimiter',  tier: 'heavy',   description: 'AI生成限流 (30/min)' },
  { name: 'uploadLimiter', tier: 'normal',  description: '上传限流 (20/min)' },
  { name: 'paymentLimiter',tier: 'strict',  description: '支付限流 (15/min)' },
  { name: 'adminLimiter',  tier: 'admin',   description: '管理后台限流 (60/min)' },
  { name: 'aiConcurrencyGuard', tier: 'heavy', description: 'AI并发控制 (3路)' },
];

/**
 * 获取限流器注册表摘要（供健康仪表盘）
 */
function getRateLimiterSummary() {
  return RATE_LIMITER_REGISTRY.map(({ name, tier, description }) => ({ name, tier, description }));
}

/**
 * 执行全量健康检查
 * @param {boolean} authenticated - 是否为已认证用户（未认证仅返回基本状态）
 * @returns {Promise<Object>} 健康状态对象
 */
export async function runHealthCheck(authenticated = false) {
  const status = {
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    memory: Math.round(process.memoryUsage().rss / 1024 / 1024),
    node: process.version,
    checks: { db: false, redis: false, ai: {} },
    gateway: {},
  };

  // DB 检查
  let schemaVersion = 0;
  try {
    const db = await import('../dao/db.js');
    const conn = await db.default.getConnection();
    try {
      const [tables] = await conn.query('SHOW TABLES');
      status.checks.db = true;
      schemaVersion = tables.length;
    } finally {
      conn.release();
    }
  } catch {
    status.checks.db = false;
    status.status = 'db_down';
  }

  // Redis 检查
  try {
    const { ping } = await import('../dao/redis.js');
    await ping();
    status.checks.redis = true;
  } catch {
    status.checks.redis = false;
  }

  // AI 模型检查
  try {
    const { listModels } = await import('../services/aiEngine.js');
    for (const m of listModels()) {
      status.checks.ai[m.id] = m.health ? (await m.health()).status : 'unknown';
    }
  } catch {
    status.checks.ai = {};
  }

  // 队列检查
  try {
    const { getAllQueueStats } = await import('../services/queueManager.js');
    status.queues = await getAllQueueStats();
  } catch {
    status.queues = {};
  }

  // 网关组件状态（已认证用户可查看详情）
  if (authenticated) {
    status.gateway = {
      rateLimiters: getRateLimiterSummary(),
      correlationId: 'enabled',
      ipWhitelist: 'active',
    };
    status.schema_version = schemaVersion;
  }

  const aiOnline = Object.values(status.checks.ai).filter(s => s === 'ok').length;
  const aiTotal = Object.keys(status.checks.ai).length;
  status.degraded = !status.checks.redis || (aiTotal > 0 && aiOnline === 0);

  if (status.checks.db && status.degraded) {
    status.status = 'degraded';
  }

  return status;
}
