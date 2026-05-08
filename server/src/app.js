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
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.js';
import { readFileSync } from 'fs';
const swaggerDoc = JSON.parse(readFileSync(new URL('./config/swagger.json', import.meta.url), 'utf-8'));
import userRoutes from './route/userRoutes.js';
import sizeTemplateRoutes from './route/sizeTemplateRoutes.js';
import brandRoutes from './route/brandRoutes.js';
import imageRoutes from './route/imageRoutes.js';
import videoRoutes from './route/videoRoutes.js';
import batchRoutes from './route/batchRoutes.js';
import advancedImageRoutes from './route/advancedImageRoutes.js';
import advancedVideoRoutes from './route/advancedVideoRoutes.js';
import paymentRoutes from './route/paymentRoutes.js';
import adminRoutes from './route/adminRoutes.js';
import adminModelsRoutesV4 from './route/v4_admin_models.routes.js';
import testWorkbenchRoutesV4 from './route/v4_test_workbench.routes.js';
import notificationRoutes from './route/notificationRoutes.js';
import smsRoutes from './route/smsRoutes.js';
import emailRoutes from './route/emailRoutes.js';
import uploadRoutes from './route/uploadRoutes.js';
import promptRoutes from './route/promptRoutes.js';
import creditRoutes from './route/creditRoutes.js';
import tenantRoutes from './route/tenantRoutes.js';
import diyRoutes from './route/diyRoutes.js';
import formRoutes from './route/formRoutes.js';
import proxyRoutes from './route/proxyRoutes.js';
import rechargeRoutes from './route/rechargeRoutes.js';
import allinpayRoutes from './route/allinpayRoutes.js';
import automationRoutes from './route/automationRoutes.js';
import aiLogRoutes from './route/aiLogRoutes.js';
import taskRoutes from './route/taskRoutes.js';
import helpRoutes from './route/helpRoutes.js';
import collectionRoutes from './route/collectionRoutes.js';
import badgeRoutes from './route/badgeRoutes.js';
import tierRoutes from './route/tierRoutes.js';
import abuseRoutes from './route/abuseRoutes.js';
import platformDetailRoutes from './route/platformDetailRoutes.js';
import multilingualRoutes from './route/multilingualRoutes.js';
import complianceRoutes from './route/complianceRoutes.js';
import analyticsRoutes from './route/analyticsRoutes.js';
import platformSpecRoutes from './route/platformSpecRoutes.js';
import aiDispatchRoutes from './route/aiDispatchRoutes.js';
import posterRoutesV4 from './route/v4_poster.routes.js';
import videoTranslateRoutesV4 from './route/v4_video_translate.routes.js';

// =====================================================
// v4.1 中间件 + 路由 (2026-05-08 引入)
// =====================================================
import { authMiddleware } from './middleware/auth.middleware.js';
import { auditLogMiddleware } from './middleware/audit-log.middleware.js';
import authRoutes from './route/v4_auth.routes.js';
import { configPublicRouter, configAdminRouter } from './route/v4_config.routes.js';
import imageRoutesV4 from './route/v4_image.routes.js';
import videoRoutesV4 from './route/v4_video.routes.js';
import jobRoutesV4 from './route/v4_job.routes.js';
import pointsRoutesV4 from './route/v4_points.routes.js';
import distributionRoutesV4 from './route/v4_distribution.routes.js';
import assetsRoutesV4 from './route/v4_assets.routes.js';
import platformBindRoutesV4 from './route/v4_platform_bind.routes.js';
import userRoutesV4 from './route/v4_user.routes.js';
import uploadRoutesV4 from './route/v4_upload.routes.js';
import { adminRouter as siteConfigAdminRouter, publicRouter as siteConfigPublicRouter } from './route/siteConfigRoutes.js';
import tenantContext from './middleware/tenantContext.js';
import { metricsMiddleware, metricsEndpoint } from './middleware/metrics.js';
import { csrfProtection } from './middleware/csrf.js';
import cspMiddleware from './middleware/csp.js';
import paramFilter from './middleware/paramFilter.js';
import openApiRoutes from './route/openApiRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// 基础安全中间件
app.use(helmet());
app.use(cspMiddleware);
app.use(cors({ credentials: true, origin: true }));

// 响应压缩
app.use(compression());

// Prometheus 指标采集
app.use(metricsMiddleware);

// 请求限流（读取环境变量配置）
app.use(rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 429, msg: '请求过于频繁，请稍后再试', data: null },
}));

// 解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// SQL 注入防护
app.use(sqlGuardMiddleware);

// 请求日志
app.use(requestLogger);

// CSRF 双重提交 Cookie 防护 (POST/PUT/PATCH/DELETE)
app.use(csrfProtection);

// v4.1 统一认证 + 多租户上下文 + 审计日志中间件
// Phase 1 P0 修复：auth 跑在 tenantContext 前面，确保 req.tenantId 由 JWT payload 注入 (2026-05-08)
app.use(authMiddleware);
app.use(tenantContext);
app.use(auditLogMiddleware);

// 健康检查 — DB 必须在线，Redis 离线仅标记 degraded 不阻塞探活
app.get('/api/health', async (_req, res) => {
  const status = {
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    memory: Math.round(process.memoryUsage().rss / 1024 / 1024),
    node: process.version,
    checks: { db: false, redis: false },
  };
  try { const db = await import('./dao/db.js'); const conn = await db.default.getConnection(); conn.release(); status.checks.db = true; } catch { /* ignore */ }
  try { const redis = await import('./dao/redis.js'); await redis.default.ping(); status.checks.redis = true; } catch { /* ignore */ }
  status.degraded = !status.checks.redis;
  res.status(status.checks.db ? 200 : 503).json({
    code: status.checks.db ? 200 : 503,
    msg: status.checks.db ? (status.checks.redis ? 'ok' : 'degraded') : 'db_down',
    data: status,
  });
});

// Prometheus 指标端点
app.get('/api/metrics', metricsEndpoint);

// 静态文件服务（上传目录），带缓存
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: '7d',
  etag: true,
  lastModified: true,
  setHeaders(res, filepath) {
    if (/\.(jpg|jpeg|png|gif|webp|svg|mp4|webm|mov)$/i.test(filepath)) {
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    }
  },
}));

// 路由注册
// v4.1 路由 (2026-05-08)
app.use('/api/auth', authRoutes);
app.use('/api/config', configPublicRouter);
app.use('/api/admin/config', configAdminRouter);
app.use('/api/images', imageRoutesV4);
app.use('/api/ai', imageRoutesV4);  // /api/ai/enhance-prompt 也在 v4_image.routes 中
app.use('/api/videos', videoRoutesV4);
app.use('/api/jobs', jobRoutesV4);
app.use('/api/job', jobRoutesV4);   // 别名: useTaskPolling 轮询 /api/job/:id
app.use('/api/points', pointsRoutesV4);
app.use('/api/distribution', distributionRoutesV4);
app.use('/api/assets', assetsRoutesV4);
app.use('/api/platforms', platformBindRoutesV4);
app.use('/api/user', userRoutesV4);
app.use('/api/upload', uploadRoutesV4);  // v4.1 分片上传 (must precede legacy)

// Swagger 文档（仅开发环境）
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup({ ...swaggerDoc, paths: { ...swaggerDoc.paths, ...swaggerSpec.paths } }));
}
app.use('/api/users', userRoutes);
app.use('/api/open', openApiRoutes);
app.use('/api/templates', sizeTemplateRoutes);
app.use('/api/brand', brandRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/batch', batchRoutes);
app.use('/api/advanced', advancedImageRoutes);
app.use('/api/adv-video', advancedVideoRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/plans', paymentRoutes); // 公开别名
app.use('/api/admin', adminRoutes);
app.use('/api/admin/models', adminModelsRoutesV4);
app.use('/api/test', testWorkbenchRoutesV4);
app.use('/api/posters', posterRoutesV4);
app.use('/api/video-translate', videoTranslateRoutesV4);
app.use('/api/notifications', notificationRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/prompts', promptRoutes);
app.use('/api/credits', creditRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/diy', diyRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/proxy', proxyRoutes);
app.use('/api/recharge', rechargeRoutes);
app.use('/api/allinpay', allinpayRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/admin/ai-logs', aiLogRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/help', helpRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/admin/site-config', siteConfigAdminRouter);
app.use('/api/site-config/public', siteConfigPublicRouter);
app.use('/api/badges', badgeRoutes);
app.use('/api/tier', tierRoutes);
app.use('/api/admin/abuse', abuseRoutes);
app.use('/api/platforms', platformDetailRoutes);
app.use('/api/multilingual', multilingualRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/platform-specs', platformSpecRoutes);
app.use('/api/ai-dispatch', aiDispatchRoutes);  // 多模型统一调度: dispatch/categories/health/stats/cache

// 404
app.use((_req, res) => {
  sendError(res, ERROR_CODE.NOT_FOUND, '接口不存在');
});

// 全局异常捕获
app.use((err, _req, res, _next) => {
  console.error('[Server Error]', err);
  sendError(res, ERROR_CODE.INTERNAL_ERROR, '服务器内部错误');
});

export default app;
