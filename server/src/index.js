import { createServer } from 'http';

import app from './app.js';
import wsManager from './services/wsManager.js';
import logger from './utils/logger.js';
import { server as serverConfig, isProduction } from './config/index.js';
import { registerAllAdapters } from './services/adapters/index.js';
import { validateStartupConfig, validateRuntimeConnections } from './utils/startupGuard.js';

const { port, env } = serverConfig;

// 启动前配置校验
await validateStartupConfig();

// 启动前运行时连接检查 (MySQL / Redis / MinIO)
await validateRuntimeConnections();

// 注册 AI 模型适配器（启动时自动加载）
await registerAllAdapters();

const server = createServer(app);

// WebSocket 实时进度
wsManager.attach(server);

// BullMQ Worker 启动（非阻塞，Redis 不可用时降级）
import('./services/workerBootstrap.js').then(({ bootstrapWorkers }) => bootstrapWorkers()).catch((err) => { logger.warn('[Worker] 启动失败，队列将降级', { error: err.message }); });

let cleanupTimer = null;
let recoverTimer = null;

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`端口 ${port} 已被占用，请先释放端口再启动服务`, { code: err.code });
    process.exit(1);
  }
  logger.error('服务器启动错误', { message: err.message, code: err.code });
  process.exit(1);
});

server.listen(port, () => {
  logger.info(`${env} 模式 — http://localhost:${port}  |  WebSocket /ws  |  BullMQ Workers`);

  // 定时清理废弃上传 (每 30 分钟)
  cleanupTimer = setInterval(() => {
    import('./utils/file-upload.js').then(({ cleanupStaleUploads }) => cleanupStaleUploads()).catch((err) => { logger.warn('[Cleanup] 加载失败', { error: err.message }); });
  }, 30 * 60 * 1000).unref();

  // 定时恢复卡住的任务 (每 5 分钟)
  recoverTimer = setInterval(() => {
    import('./dao/taskDao.js').then(({ recoverStuckTasks }) => recoverStuckTasks()).catch((err) => { logger.warn('[Cron] 恢复卡住任务失败', { error: err.message }); });
    import('./services/job-queue.service.js').then(({ recoverStuckJobs }) => recoverStuckJobs()).catch((err) => { logger.warn('[Cron] job_queue 恢复失败', { error: err.message }); });
  }, 5 * 60 * 1000).unref();
});

// ==================== 全局异常处理 ====================

process.on('uncaughtException', (err) => {
  const logEntry = { message: err.message };
  if (!isProduction) logEntry.stack = err.stack?.split('\n').slice(0, 3).join('\n');
  logger.error('未捕获异常', logEntry);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  const logEntry = { message: msg };
  if (!isProduction) logEntry.stack = reason?.stack?.split('\n').slice(0, 3).join('\n');
  logger.error('未处理的 Promise 拒绝', logEntry);
  // unhandledRejection 不触发 shutdown — 与 uncaughtException 不同，进程状态仍可恢复
});

// ==================== 优雅关闭 ====================

let shuttingDown = false;
let forceExitTimer = null;

function gracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info(`收到 ${signal}，开始优雅关闭...`);
  const isCrash = signal === 'uncaughtException' || signal === 'unhandledRejection';
  const exitCode = isCrash ? 1 : 0;

  // 清理定时器
  if (cleanupTimer) { clearInterval(cleanupTimer); cleanupTimer = null; }
  if (recoverTimer) { clearInterval(recoverTimer); recoverTimer = null; }

  server.close(() => {
    (async () => {
    logger.info('HTTP/WS 服务已停止');

    // 关闭 DB 连接池
    try {
      const db = await import('./dao/db.js');
      await db.default.end();
      logger.info('DB 连接池已关闭');
    } catch (e) { logger.warn('DB 关闭失败', { message: e.message }); }

    // 关闭 BullMQ
    try {
      const qm = await import('./services/queueManager.js');
      await qm.closeAll();
      logger.info('BullMQ 队列已关闭');
    } catch (e) { logger.warn('BullMQ 关闭失败', { message: e.message }); }

    // 关闭 Redis
    try {
      const { quit } = await import('./dao/redis.js');
      await quit();
      logger.info('Redis 已关闭');
    } catch (e) { logger.warn('Redis 关闭失败', { message: e.message }); }

    if (forceExitTimer) { clearTimeout(forceExitTimer); forceExitTimer = null; }
    // eslint-disable-next-line no-process-exit
    process.exit(exitCode);
    })().catch((e) => { logger.error('优雅关闭失败', { message: e.message }); process.exit(1); });
  });

  // 10秒强制退出
  forceExitTimer = setTimeout(() => {
    logger.error('强制退出');
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
