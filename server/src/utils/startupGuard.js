/**
 * 启动配置校验 — 生产环境关键安全检查
 * 在 index.js 中 server.listen() 之前调用
 */
import config from '../config/index.js';
import logger from '../utils/logger.js';

export async function validateStartupConfig() {
  const errors = [];
  const warnings = [];
  const isProd = config.env === 'production';

  // P0: MOCK_ENABLED must be explicitly false in production
  if (isProd && config.mockEnabled) {
    errors.push('生产环境严禁开启 MOCK_ENABLED，请设置 MOCK_ENABLED=false');
  }

  // P0: JWT_SECRET minimum strength
  if (isProd && config.jwt.secret.length < 32) {
    errors.push('生产环境 JWT_SECRET 长度不足 32 字符');
  }

  // P0: SMS/Email providers in production
  // (already validated at config load — double-check here as safety net)
  if (isProd && config.sms.provider === 'mock') {
    errors.push('生产环境 SMS_PROVIDER 不能为 mock');
  }
  if (isProd && config.email.provider === 'mock') {
    errors.push('生产环境 EMAIL_PROVIDER 不能为 mock');
  }

  // P0: AI API key not a placeholder
  if (isProd) {
    const apiKey = config.ai.apiKey || '';
    if (!apiKey || ['your-openai-api-key', 'your-', 'sk-your-', 'CHANGE_ME'].some(p => apiKey.startsWith(p) || apiKey === p)) {
      errors.push('生产环境必须设置真实 OPENAI_API_KEY（不能为占位值）');
    }
  }

  // P1: ENCRYPTION_KEY present and valid
  if (!process.env.ENCRYPTION_KEY) {
    errors.push('ENCRYPTION_KEY 环境变量未设置');
  } else if (Buffer.byteLength(process.env.ENCRYPTION_KEY, 'utf8') !== 32) {
    errors.push(`ENCRYPTION_KEY 长度必须为 32 字节（当前: ${Buffer.byteLength(process.env.ENCRYPTION_KEY, 'utf8')})`);
  }

  // P1: JWT_SECRET not a known placeholder
  if (isProd && ['CHANGE_ME', 'your-secret-key', 'dev-secret'].includes(process.env.JWT_SECRET || '')) {
    errors.push('生产环境 JWT_SECRET 不能为占位值 CHANGE_ME/your-secret-key');
  }

  // P1: JWT_REFRESH_SECRET
  if (isProd && !process.env.JWT_REFRESH_SECRET) {
    errors.push('生产环境必须设置 JWT_REFRESH_SECRET');
  }

  // P0: DB password not default (also catch placeholder patterns)
  if (isProd) {
    const dbPwd = config.mysql.password || '';
    if (!dbPwd || ['CHANGE_ME', 'your-db-password', 'password', 'root', 'changeme'].includes(dbPwd.toLowerCase())) {
      errors.push('生产环境 DB_PASSWORD 未设置或仍为弱密码');
    }
  }

  // P1: CSRF_SECRET 已移除 — csrf.js 使用 crypto.randomBytes 动态生成，不使用环境变量

  // P1: External AI API keys in production
  if (isProd) {
    const aiProviderKeys = [
      { key: 'CLAUDE_API_KEY', name: 'Claude' },
      { key: 'E2B_API_KEY', name: 'E2B 代码沙箱' },
      { key: 'STABILITY_API_KEY', name: 'Stability AI' },
      { key: 'REPLICATE_API_KEY', name: 'Replicate' },
    ];
    for (const { key, name } of aiProviderKeys) {
      const val = process.env[key] || '';
      if (!val || ['CHANGE_ME', 'your-', 'sk-your-'].some(p => val.startsWith(p))) {
        warnings.push(`生产环境未设置有效的 ${key}（${name}），相关功能将不可用`);
      }
    }
  }

  // P1: ALLINPAY payment keys in production
  if (isProd) {
    const allinpayCusid = process.env.ALLINPAY_CUSID || '';
    const allinpayAppid = process.env.ALLINPAY_APPID || '';
    if (!allinpayCusid) {
      errors.push('生产环境必须设置 ALLINPAY_CUSID（通联支付商户号）');
    }
    if (!allinpayAppid) {
      errors.push('生产环境必须设置 ALLINPAY_APPID（通联支付应用ID）');
    }
    if (!process.env.ALLINPAY_NOTIFY_URL) {
      errors.push('生产环境必须设置 ALLINPAY_NOTIFY_URL（支付回调地址）');
    }
  }

  // P1: ALLINPAY key file existence (production)
  if (isProd) {
    const fs = await import('fs');
    const allinpayConfig = (await import('../config/allinpay.js')).default;
    const keyPath = allinpayConfig.privateKeyPath;
    if (keyPath) {
      try { await fs.promises.access(keyPath); }
      catch { errors.push(`通联支付私钥文件不存在: ${keyPath}`); }
    } else if (!allinpayConfig.privateKey) {
      errors.push('生产环境必须设置 ALLINPAY_PRIVATE_KEY 或 ALLINPAY_PRIVATE_KEY_PATH');
    }
  }

  // P2: ELEVENLABS_API_KEY warning (voice clone will degrade silently)
  if (isProd && !process.env.ELEVENLABS_API_KEY) {
    warnings.push('生产环境未设置 ELEVENLABS_API_KEY，语音克隆将降级为 Mock 模式');
  }
  if (isProd && (!config.mysql.host || config.mysql.host === 'localhost')) {
    warnings.push('生产环境 DB_HOST 仍为 localhost');
  }
  if (isProd && (!config.redis.host || config.redis.host === 'localhost')) {
    warnings.push('生产环境 REDIS_HOST 仍为 localhost');
  }
  if (isProd && !config.redis.password) {
    warnings.push('生产环境建议设置 REDIS_PASSWORD');
  }
  if (isProd && (!config.appUrl || config.appUrl.length === 0)) {
    errors.push('生产环境必须设置 APP_URL，否则邮件/短信/支付回调链接将为空');
  }

  // P1: Runtime connectivity checks (async — call separately after config validation)
  // See validateRuntimeConnections() below
  if (warnings.length) {
    for (const w of warnings) logger.warn(`[StartupGuard] ${w}`);
  }
  if (errors.length) {
    for (const e of errors) logger.error(`[StartupGuard] ${e}`);
    throw new Error(`启动配置校验失败 (${errors.length} 项):\n${errors.map(e => `  - ${e}`).join('\n')}`);
  }

  logger.info(`[StartupGuard] 配置校验通过 (env=${config.env}, mock=${config.mockEnabled})`);
}

/**
 * 运行时连接检查 — MySQL / Redis / MinIO
 * 在 server.listen() 之前调用，确保基础设施可达
 */
export async function validateRuntimeConnections() {
  const results = { ok: true, checks: {} };

  // MOCK_ENABLED=true → skip infrastructure checks, use in-memory fallbacks
  if (config.mockEnabled) {
    logger.info('[StartupGuard] MOCK_ENABLED=true, skipping runtime connection checks');
    return { ok: true, checks: { mysql: 'skipped', redis: 'skipped' } };
  }

  // MySQL
  try {
    const { default: mysql } = await import('mysql2/promise');
    const conn = await mysql.createConnection({
      host: config.mysql.host,
      port: config.mysql.port,
      user: config.mysql.user,
      password: config.mysql.password,
      database: config.mysql.database,
      connectTimeout: 5000,
    });
    await conn.execute('SELECT 1');
    await conn.end();
    results.checks.mysql = true;
    logger.info('[StartupGuard] MySQL 连接正常');
  } catch (err) {
    results.checks.mysql = false;
    results.ok = false;
    logger.error(`[StartupGuard] MySQL 连接失败: ${err.message}`);
  }

  // Redis
  try {
    const { createClient } = await import('redis');
    const redis = createClient({
      url: `redis://${config.redis.password ? `:${config.redis.password}@` : ''}${config.redis.host}:${config.redis.port}`,
      socket: { connectTimeout: 5000 },
    });
    await redis.connect();
    await redis.ping();
    await redis.quit();
    results.checks.redis = true;
    logger.info('[StartupGuard] Redis 连接正常');
  } catch (err) {
    results.checks.redis = false;
    results.ok = false;
    logger.error(`[StartupGuard] Redis 连接失败: ${err.message}`);
  }

  // MinIO (if configured)
  if (process.env.MINIO_ENDPOINT) {
    try {
      const url = `${process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http'}://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT || 9000}/minio/health/live`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      results.checks.minio = res.ok;
      if (!res.ok) results.ok = false;
      logger.info(`[StartupGuard] MinIO 连接${res.ok ? '正常' : '失败'}`);
    } catch (err) {
      results.checks.minio = false;
      results.ok = false;
      logger.error(`[StartupGuard] MinIO 连接失败: ${err.message}`);
    }
  }

  if (!results.ok) {
    const failed = Object.entries(results.checks).filter(([, v]) => !v).map(([k]) => k).join(', ');
    throw new Error(`运行时连接检查失败: ${failed}`);
  }
  logger.info('[StartupGuard] 运行时连接检查全部通过');
  return results;
}
