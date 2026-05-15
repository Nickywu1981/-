import { createServer } from 'http';

import app from './app.js';
import wsManager from './services/wsManager.js';
import logger from './utils/logger.js';
import { server as serverConfig, isProduction } from './config/index.js';
import { registerAllAdapters } from './services/adapters/index.js';
import { validateStartupConfig, validateRuntimeConnections } from './utils/startupGuard.js';
import { registerInterval, runShutdown } from './utils/shutdownRegistry.js';

// Register crash handlers BEFORE any startup logic (failsafe)
process.on('uncaughtException', (err) => {
  if (err.code === 'ECONNRESET' || err.code === 'EPIPE') {
    logger.warn('[Server] Uncaught socket error (ignored)', { code: err.code });
    return;
  }
  logger.error('[Server] Uncaught exception', { error: err.message, stack: err.stack?.split('\n').slice(0, 3).join('\n') });
  process.exitCode = 1;
  gracefulShutdown('uncaughtException').finally(() => process.exit(1));
});
process.on('unhandledRejection', (reason) => {
  logger.error('[Server] Unhandled rejection', { message: reason?.message || String(reason) });
});

const { port, env } = serverConfig;

// Pre-startup config validation
await validateStartupConfig();

// Pre-startup runtime connection check (MySQL / Redis / MinIO)
await validateRuntimeConnections();

// Register AI model adapters (auto-loaded at startup)
await registerAllAdapters();

const server = createServer(app);

// WebSocket real-time progress
wsManager.attach(server);

let cleanupTimer = null;
let recoverTimer = null;

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`Port ${port} already in use, release the port before restarting`, { code: err.code });
    process.exit(1);
  }
  logger.error('Server startup error', { message: err.message, code: err.code });
  process.exit(1);
});

server.listen(port, () => {
  logger.info(`${env} mode — http://localhost:${port}  |  WebSocket /ws  |  BullMQ Workers`);

  // Periodic cleanup of stale uploads (every 30 min)
  cleanupTimer = registerInterval(() => {
    import('./utils/file-upload.js').then(({ cleanupStaleUploads }) => cleanupStaleUploads()).catch((err) => { logger.warn('[Cleanup] Load failed', { error: err.message }); });
    import('./services/mediaPipelineService.js').then(({ cleanupPipelineTemp }) => cleanupPipelineTemp()).catch((err) => { logger.warn('[Cleanup] Pipeline temp cleanup failed', { error: err.message }); });
    import('./services/adapters/edgeTtsAdapter.js').then(({ cleanupTtsAudio }) => cleanupTtsAudio()).catch((err) => { logger.warn('[Cleanup] TTS cleanup failed', { error: err.message }); });
  }, 30 * 60 * 1000);

  // Periodic stuck-task recovery (every 5 min)
  recoverTimer = registerInterval(() => {
    import('./dao/taskDao.js').then(({ recoverStuckTasks }) => recoverStuckTasks()).catch((err) => { logger.warn('[Cron] Stuck task recovery failed', { error: err.message }); });
    import('./services/job-queue.service.js').then(({ recoverStuckJobs }) => recoverStuckJobs()).catch((err) => { logger.warn('[Cron] job_queue recovery failed', { error: err.message }); });
  }, 5 * 60 * 1000);

  // E2B orphan sandbox cleanup + warm pool init
  import('./services/e2b.service.js').then(({ _startupOrphanCheck, _initWarmPool }) => {
    _startupOrphanCheck().catch((err) => { logger.warn('[E2B] Orphan check failed', { error: err.message }); });
    _initWarmPool().catch((err) => { logger.warn('[E2B] Warm pool init failed', { error: err.message }); });
  }).catch((err) => { logger.warn('[E2B] Load failed', { error: err.message }); });

  // Self-healing engine: periodic circuit-breaker recovery + model auto-recovery + adaptive rate limiting
  import('./services/autoRecoveryService.js').then(({ startAutoRecoveryLoop }) => {
    startAutoRecoveryLoop(60_000);
  }).catch((err) => { logger.warn('[AutoRecovery] Startup failed', { error: err.message }); });

  // Feedback learning: periodic scoring feedback → model weight adjustment (every 1h)
  import('./services/feedbackLearningService.js').then(({ startFeedbackLoop }) => {
    startFeedbackLoop(3600_000);
  }).catch((err) => { logger.warn('[Feedback] Startup failed', { error: err.message }); });

  // L5 self-healing seed strategies: initialize 6 default strategies on first run
  import('./services/incidentLearningService.js').then(({ seedDefaultStrategies }) => {
    seedDefaultStrategies().catch((err) => { logger.warn('[IncidentLearning] Seed strategy init failed', { error: err.message }); });
  }).catch((err) => { logger.warn('[IncidentLearning] Load failed', { error: err.message }); });

  // L5 adaptive threshold: learn baseline once on startup
  import('./services/adaptiveThresholdService.js').then(({ learnBaseline }) => {
    learnBaseline(7).catch((err) => { logger.warn('[AdaptiveThreshold] Baseline learning failed', { error: err.message }); });
  }).catch((err) => { logger.warn('[AdaptiveThreshold] Load failed', { error: err.message }); });
});

// ==================== Graceful shutdown ====================

let shuttingDown = false;
let forceExitTimer = null;

async function gracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info(`Received ${signal}, starting graceful shutdown...`);
  const isCrash = signal === 'uncaughtException' || signal === 'unhandledRejection';
  const exitCode = isCrash ? 1 : 0;

  // Clean up all registered timers and resources
  await runShutdown();

  server.close(() => {
    (async () => {
    logger.info('HTTP/WS server stopped');

    // Close DB connection pool
    try {
      const db = await import('./dao/db.js');
      await db.default.end();
      logger.info('DB pool closed');
    } catch (e) { logger.warn('DB close failed', { message: e.message }); }

    // Close Redis
    try {
      const { quit } = await import('./dao/redis.js');
      await quit();
      logger.info('Redis closed');
    } catch (e) { logger.warn('Redis close failed', { message: e.message }); }

    if (forceExitTimer) { clearTimeout(forceExitTimer); forceExitTimer = null; }
    // eslint-disable-next-line no-process-exit
    process.exit(exitCode);
    })().catch((e) => { logger.error('Graceful shutdown failed', { message: e.message }); process.exit(1); });
  });

  // Force exit after 10 seconds
  forceExitTimer = setTimeout(() => {
    logger.error('Force exit triggered');
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
