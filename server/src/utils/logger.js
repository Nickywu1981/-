import { createLogger, format, transports } from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.join(__dirname, '../../logs');

import { isDevelopment, logConfig } from '../config/index.js';

const isDev = isDevelopment;

// LOG_LEVEL env var takes precedence over NODE_ENV-derived default
const LOG_LEVEL = (() => {
  const fromEnv = logConfig.level;
  const validLevels = ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'];
  if (fromEnv && validLevels.includes(fromEnv)) return fromEnv;
  return isDev ? 'debug' : 'info';
})();

// ==================== 日志采样配置 ====================

const LOG_SAMPLE_RATE = logConfig.sampleRate;
const SLOW_QUERY_THRESHOLD_MS = logConfig.slowQueryMs;

/** 判断是否应该记录此请求（采样） */
function shouldSample(path, statusCode) {
  // 错误/警告 100% 记录
  if (statusCode >= 400) return true;
  // 健康检查/高频轮询 1% 采样
  if (path.startsWith('/api/health') || path.startsWith('/ws/')) {
    return Math.random() < 0.01;
  }
  // 正常请求按采样率
  return Math.random() < LOG_SAMPLE_RATE;
}

const logger = createLogger({
  level: LOG_LEVEL,
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    isDev
      ? format.combine(format.colorize(), format.printf(({ timestamp, level, message, ...rest }) => {
          const meta = Object.keys(rest).length > 2 ? ` ${JSON.stringify(rest)}` : '';
          return `${timestamp} ${level} ${message}${meta}`;
        }))
      : format.combine(format.json()),
  ),
  transports: [
    new transports.Console({ level: isDev ? 'debug' : 'warn' }),
    ...(isDev ? [] : [
      new transports.File({ filename: path.join(LOG_DIR, 'error.log'), level: 'error', maxsize: 10 * 1024 * 1024, maxFiles: 14 }),
      new transports.File({ filename: path.join(LOG_DIR, 'combined.log'), maxsize: 10 * 1024 * 1024, maxFiles: 30 }),
    ]),
  ],
  exitOnError: false,
});

logger.on('error', (err) => {
  console.error('[Logger] Transport error:', err.message);
});

/** 请求日志中间件（带采样） */
export function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    if (!shouldSample(req.originalUrl || req.url, res.statusCode)) return;

    const ms = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    logger[level]('request', {
      method: req.method, path: req.originalUrl || req.url, status: res.statusCode,
      ms, ip: req.ip, userId: req.user?.id || null,
    });
  });
  next();
}

/** 慢查询日志 */
function slowQueryLog(sql, ms, params) {
  if (ms > SLOW_QUERY_THRESHOLD_MS) {
    logger.warn('slow_query', { sql: sql.substring(0, 200), ms, paramCount: params?.length });
  }
}

/** 获取日志统计 */
function getLogStats() {
  return {
    sampleRate: LOG_SAMPLE_RATE,
    slowQueryThreshold: SLOW_QUERY_THRESHOLD_MS,
    transports: logger.transports.length,
    level: logger.level,
  };
}

/** 创建带标签的子日志器 */
export function getLogger(label) {
  return logger.child({ label });
}

export default logger;
