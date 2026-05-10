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

  // P0: AI API key in production
  if (isProd && !config.ai.apiKey) {
    errors.push('生产环境必须设置 OPENAI_API_KEY');
  }

  // P1: ENCRYPTION_KEY present and valid
  if (!process.env.ENCRYPTION_KEY) {
    errors.push('ENCRYPTION_KEY 环境变量未设置');
  } else if (Buffer.from(process.env.ENCRYPTION_KEY, 'utf8').length !== 32) {
    errors.push(`ENCRYPTION_KEY 长度必须为 32 字节（当前: ${Buffer.from(process.env.ENCRYPTION_KEY, 'utf8').length})`);
  }

  // P1: JWT_REFRESH_SECRET
  if (isProd && !process.env.JWT_REFRESH_SECRET) {
    errors.push('生产环境必须设置 JWT_REFRESH_SECRET');
  }

  // P1: DB password not default
  if (isProd && (!config.mysql.password || config.mysql.password === 'CHANGE_ME')) {
    errors.push('生产环境 DB_PASSWORD 未设置或仍为默认值 CHANGE_ME');
  }

  // P1: CSRF secret
  if (isProd && (!process.env.CSRF_SECRET || process.env.CSRF_SECRET === 'dev-csrf-secret' || process.env.CSRF_SECRET === 'your-csrf-secret')) {
    errors.push('生产环境必须设置强 CSRF_SECRET');
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
