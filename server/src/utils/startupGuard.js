/**
 * 启动配置校验 — 生产环境关键安全检查
 * 在 index.js 中 server.listen() 之前调用
 */
import config from '../config/index.js';
import logger from '../utils/logger.js';

export function validateStartupConfig() {
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
  } else if (Buffer.from(process.env.ENCRYPTION_KEY, 'utf8').length !== 32) {
    errors.push(`ENCRYPTION_KEY 长度必须为 32 字节（当前: ${Buffer.from(process.env.ENCRYPTION_KEY, 'utf8').length})`);
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

  // P1: STORAGE_DRIVER must not be local in production
  const storageDriver = process.env.STORAGE_DRIVER || process.env.STORAGE_PROVIDER || 'local';
  if (isProd && storageDriver === 'local') {
    errors.push('生产环境 STORAGE_DRIVER 不能为 local（本地存储不支持水平扩展），请使用 cos 或 s3');
  }
  if (isProd && storageDriver === 'cos') {
    if (!process.env.COS_SECRET_ID) errors.push('生产环境 COS 存储需设置 COS_SECRET_ID');
    if (!process.env.COS_SECRET_KEY) errors.push('生产环境 COS 存储需设置 COS_SECRET_KEY');
    if (!process.env.COS_BUCKET) errors.push('生产环境 COS 存储需设置 COS_BUCKET');
  }
  if (isProd && storageDriver === 's3') {
    if (!process.env.S3_ACCESS_KEY) errors.push('生产环境 S3 存储需设置 S3_ACCESS_KEY');
    if (!process.env.S3_SECRET_KEY) errors.push('生产环境 S3 存储需设置 S3_SECRET_KEY');
    if (!process.env.S3_BUCKET) errors.push('生产环境 S3 存储需设置 S3_BUCKET');
    if (!process.env.S3_ENDPOINT) errors.push('生产环境 S3 存储需设置 S3_ENDPOINT');
  }

  // P2: Warnings
  if (isProd && (!config.mysql.host || config.mysql.host === 'localhost')) {
    warnings.push('生产环境 DB_HOST 仍为 localhost');
  }
  if (isProd && (!config.redis.host || config.redis.host === 'localhost')) {
    warnings.push('生产环境 REDIS_HOST 仍为 localhost');
  }
  if (isProd && !config.redis.password) {
    warnings.push('生产环境建议设置 REDIS_PASSWORD');
  }

  // Report
  if (warnings.length) {
    for (const w of warnings) logger.warn(`[StartupGuard] ${w}`);
  }
  if (errors.length) {
    for (const e of errors) logger.error(`[StartupGuard] ${e}`);
    throw new Error(`启动配置校验失败 (${errors.length} 项):\n${errors.map(e => `  - ${e}`).join('\n')}`);
  }

  logger.info(`[StartupGuard] 配置校验通过 (env=${config.env}, mock=${config.mockEnabled})`);
}
