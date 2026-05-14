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

import { getTraceContext } from '../services/traceService.js';

// ==================== TraceID 注入 ====================

const traceIdFormat = format((info) => {
  try {
    const ctx = getTraceContext();
    if (ctx?.traceId && ctx.traceId !== '00000000000000000000000000000000') {
      info.traceId = ctx.traceId;
    }
  } catch { /* traceService not loaded */ }
  return info;
});

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
    traceIdFormat(),
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    isDev
      ? format.combine(format.colorize(), format.printf(({ timestamp, level, message, traceId, ...rest }) => {
          const tid = traceId ? ` [${traceId.slice(0, 8)}]` : '';
          const meta = Object.keys(rest).length > 2 ? ` ${JSON.stringify(rest)}` : '';
          return `${timestamp} ${level}${tid} ${message}${meta}`;
        }))
      : format.combine(format.json()),
  ),
  transports: [
    new transports.Console({ level: process.env.CONSOLE_LOG_LEVEL || (isDev ? 'debug' : 'info') }),
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

/** 创建带标签的子日志器 */
export function getLogger(label) {
  return logger.child({ label });
}

export default logger;
