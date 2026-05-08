/**
 * Movio AI v4.1 — App Entry
 * 2026-05-08 | G5 后端开发 | G1 架构终审
 *
 * 中间件执行顺序 (v4.1):
 *   helmet → cors → compression → rateLimit → json/cookie → SQLGuard → requestLog
 *   → authMiddleware (MS-SECURITY 第1层)
 *   → requireRole（按路由单独使用，RBAC 角色中间件）
 *   → contentModeration (MS-MODERATION 第3层) ★NEW
 *   → auditLog (第4层)
 *   → 业务路由
 */
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import { sqlGuardMiddleware } from './utils/sqlGuard.js';
import { requestLogger } from './utils/logger.js';
import { error as sendError } from './utils/response.js';
import { ERROR_CODE } from './constants/errorCode.js';

// v4.1 中间件链
import { authMiddleware } from './middleware/auth.middleware.js';
import { auditLogMiddleware } from './middleware/audit-log.middleware.js';

// v4.1 路由
import authRoutes from './route/v4_auth.routes.js';
import { configPublicRouter, configAdminRouter } from './route/v4_config.routes.js';
import uploadRoutes from './route/v4_upload.routes.js';

// 现有路由 (v4.1 逐步迁移)
// W1: 保留旧路由作为兼容，W2/W3 逐步替换
import userRoutes from './route/userRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// =====================================================
// 基础安全层
// =====================================================
app.use(helmet());
app.use(cors({ credentials: true, origin: true }));
app.use(compression());

// =====================================================
// 解析 & 基础防护
// =====================================================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// 全局限流 (后跟按用户角色限流)
app.use(rateLimit({
  windowMs: 60000,
  max: 6000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 429, msg: '请求过于频繁，请稍后再试' },
}));

app.use(sqlGuardMiddleware);
app.use(requestLogger);

// =====================================================
// v4.1 中间件链 (按顺序)
// =====================================================
app.use(authMiddleware);       // 第1层: JWT 鉴权
app.use(auditLogMiddleware);   // 第4层: 操作审计日志
// requireRole 按路由单独使用（来自 rbac.js）
// contentModeration 按路由单独使用

// =====================================================
// 健康检查
// =====================================================
app.get('/api/health', async (_req, res) => {
  const status = {
    status: 'ok',
    version: '4.1.0',
    uptime: Math.floor(process.uptime()),
    memory_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    node: process.version,
    checks: { db: false, redis: false },
  };
  try {
    const db = await import('./dao/db.js');
    const conn = await db.default.getConnection();
    conn.release();
    status.checks.db = true;
  } catch { /* db down */ }
  try {
    const redis = await import('./dao/redis.js');
    await redis.default.ping();
    status.checks.redis = true;
  } catch { /* redis off */ }
  status.degraded = !status.checks.redis;
  res.status(status.checks.db ? 200 : 503).json({
    code: status.checks.db ? 200 : 503,
    msg: status.checks.db ? (status.checks.redis ? 'ok' : 'degraded') : 'db_down',
    data: status,
  });
});

// =====================================================
// 静态文件
// =====================================================
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: '7d',
  etag: true,
  setHeaders(res) {
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
  },
}));

// =====================================================
// v4.1 路由注册
// =====================================================
app.use('/api/auth', authRoutes);                    // 注册/登录/密码重置/登出
app.use('/api/config', configPublicRouter);          // 公开配置读取
app.use('/api/admin/config', configAdminRouter);     // Admin 配置写入
app.use('/api/upload', uploadRoutes);                // 分片上传

// W1 兼容: 保留用户管理路由
app.use('/api/users', userRoutes);

// 模型状态 (公开)
app.get('/api/models/status', async (_req, res) => {
  try {
    const { getModelStatus } = await import('./services/model-router.service.js');
    const status = getModelStatus();
    res.json({ code: 200, msg: 'ok', data: status });
  } catch (err) {
    res.status(500).json({ code: 500, msg: err.message, data: null });
  }
});

// Job 状态查询 (需登录)
app.get('/api/job/:id', async (req, res) => {
  try {
    const { getJobStatus } = await import('./services/job-queue.service.js');
    const job = await getJobStatus(req.params.id, req.user?.id);
    res.json({ code: 200, msg: 'ok', data: job });
  } catch (err) {
    sendError(res, err.status || ERROR_CODE.NOT_FOUND, err.message || '查询失败');
  }
});

app.get('/api/jobs', async (req, res) => {
  try {
    const { getUserJobs } = await import('./services/job-queue.service.js');
    const result = await getUserJobs(req.user?.id, {
      status: req.query.status,
      page: parseInt(req.query.page) || 1,
      pageSize: parseInt(req.query.pageSize) || 20,
    });
    res.json({ code: 200, msg: 'ok', data: result });
  } catch (err) {
    sendError(res, ERROR_CODE.INTERNAL_ERROR, err.message || '查询失败');
  }
});

// 用户 profile
app.get('/api/user/profile', async (req, res) => {
  try {
    const { getUserProfile } = await import('./services/auth.service.js');
    const result = await getUserProfile(req.user?.id);
    res.json({ code: 200, msg: 'ok', data: result.user });
  } catch (err) {
    sendError(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message);
  }
});

// =====================================================
// 404 & 全局异常
// =====================================================
app.use((_req, res) => {
  sendError(res, ERROR_CODE.NOT_FOUND, '接口不存在');
});

app.use((err, _req, res, _next) => {
  console.error('[Server Error v4.1]', err);
  sendError(res, ERROR_CODE.INTERNAL_ERROR, '服务器内部错误');
});

export default app;
