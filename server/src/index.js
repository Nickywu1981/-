import { createServer } from 'http';
import dotenv from 'dotenv';
import fs from 'fs';

// 按 NODE_ENV 加载对应的 .env 文件
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile, override: true });
} else {
  dotenv.config({ override: true }); // fallback to .env
}

import app from './app.js';
import wsManager from './services/wsManager.js';
import logger from './utils/logger.js';
import { server as serverConfig } from './config/index.js';
import { registerAllAdapters } from './services/adapters/index.js';

const { port, env } = serverConfig;

// 注册 AI 模型适配器（启动时自动加载）
await registerAllAdapters();

const server = createServer(app);

// WebSocket 实时进度
wsManager.attach(server);

// BullMQ Worker 启动（非阻塞，Redis 不可用时降级）
import('./services/workerBootstrap.js').then(({ bootstrapWorkers }) => bootstrapWorkers());

server.listen(port, () => {
  logger.info(`${env} 模式 — http://localhost:${port}  |  WebSocket /ws  |  BullMQ Workers`);
});

// ==================== 优雅关闭 ====================

function gracefulShutdown(signal) {
  logger.info(`收到 ${signal}，开始优雅关闭...`);

  server.close(async () => {
    logger.info('HTTP/WS 服务已停止');

    // 关闭 DB 连接池
    try {
      const db = await import('./dao/db.js');
      await db.default.end();
      logger.info('DB 连接池已关闭');
    } catch { /* DB may not be connected */ }

    // 关闭 Redis
    try {
      const redis = await import('./dao/redis.js');
      await redis.default.quit();
      logger.info('Redis 已关闭');
    } catch { /* Redis may not be connected */ }

    process.exit(0);
  });

  // 10秒强制退出
  setTimeout(() => {
    logger.error('强制退出');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
