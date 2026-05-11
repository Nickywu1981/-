import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { apiLimiter, authLimiter, codeLimiter, heavyLimiter, uploadLimiter, paymentLimiter, adminLimiter, aiConcurrencyGuard } from './middleware/rateLimiter.js';
import { metricsMiddleware, metricsEndpoint } from './middleware/metrics.js';
import { sqlGuardMiddleware } from './utils/sqlGuard.js';
import { requestLogger } from './utils/logger.js';
import logger from './utils/logger.js';
import { success, error as sendError } from './utils/response.js';
import { BusinessError } from './utils/businessError.js';
import { z } from 'zod';
import { ERROR_CODE } from './constants/errorCode.js';

// =====================================================
// 四层架构 - 网关层 + 中台层 集成 (Phase 0-A, 2026-05-11)
// =====================================================
import { correlationIdMiddleware } from './gateway/correlationId.js';
import { ipWhitelistMiddleware } from './gateway/ipWhitelist.js';
import { generateRouteMap } from './gateway/routeRegistry.js';
import { runHealthCheck } from './gateway/healthDashboard.js';
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
import analyticsRoutes from './route/analyticsRoutes.js';
import platformSpecRoutes from './route/platformSpecRoutes.js';
import aiDispatchRoutes from './route/aiDispatchRoutes.js';
import aiGatewayRoutes from './route/aiGatewayRoutes.js';
import posterRoutesV4 from './route/v4_poster.routes.js';
import videoTranslateRoutesV4 from './route/v4_video_translate.routes.js';
import copywritingRoutes from './route/copywritingRoutes.js';

// =====================================================
// v4.1 中间件 + 路由 (2026-05-08 引入)
// =====================================================
import { authMiddleware, adminAuth } from './middleware/auth.middleware.js';
import { auditLogMiddleware } from './middleware/audit-log.middleware.js';
import authRoutes from './route/v4_auth.routes.js';
import { configPublicRouter, configAdminRouter } from './route/v4_config.routes.js';
import imageRoutesV4 from './route/v4_image.routes.js';
import detailRoutesV4 from './route/v4_detail.routes.js';
import videoRoutesV4 from './route/v4_video.routes.js';
import jobRoutesV4 from './route/v4_job.routes.js';
import pointsRoutesV4 from './route/v4_points.routes.js';
import distributionRoutesV4 from './route/v4_distribution.routes.js';
import assetsRoutesV4 from './route/v4_assets.routes.js';
import platformBindRoutesV4 from './route/v4_platform_bind.routes.js';
import publishRoutesV4 from './route/v4_publish.routes.js';
import userRoutesV4 from './route/v4_user.routes.js';
import uploadRoutesV4 from './route/v4_upload.routes.js';
import cutEcosystemRoutesV4 from './route/v4_cut_ecosystem.routes.js';
import modelGenerateRoutesV4 from './route/v4_model_generate.routes.js';
import renderRoutesV4 from './route/v4_render.routes.js';
import d3RoutesV4 from './route/v4_3d.routes.js';
import complianceRoutesV4 from './route/v4_compliance.routes.js';
import voiceRoutesV4 from './route/v4_voice.routes.js';
import { adminRouter as siteConfigAdminRouter, publicRouter as siteConfigPublicRouter } from './route/siteConfigRoutes.js';
import adminWorkspaceDiyRoutes from './route/adminWorkspaceDiyRoutes.js';
import { adminRouter as geoRuleAdminRouter } from './route/geoRuleRoutes.js';
import tenantContext from './middleware/tenantContext.js';
import { optionalAuth } from './middleware/auth.js';
import { setCsrfCookie, csrfProtection } from './middleware/csrf.js';
import cspMiddleware from './middleware/csp.js';
import openApiRoutes from './route/openApiRoutes.js';
import openApiKeyRoutes from './route/openApiKeyRoutes.js';
import auditLogRoutes from './route/auditLogRoutes.js';
import geoRoutes from './route/geoRoutes.js';
import compareRoutes from './route/compareRoutes.js';
import seoKeywordRoutes from './route/seoKeywordRoutes.js';
import fabRoutes from './route/fabRoutes.js';
import memoryEmbedRoutes from './route/memoryEmbedRoutes.js';
import digitalHumanRoutesV4 from './route/v4_digital_human.routes.js';
import platformPublishRoutesV4 from './route/v4_platform_publish.routes.js';
import templateMarketRoutesV4 from './route/v4_template_market.routes.js';
import sdkRoutes from './route/sdkRoutes.js';
import adkRoutes from './route/adkRoutes.js';
import enterpriseRoutes from './route/enterpriseRoutes.js';   // Phase 1: 企业/代理端 MVP (2026-05-11)
import financeRoutes from './route/financeRoutes.js';         // Phase 2: 财务核心 (2026-05-11)
import customerRoutes from './route/customerRoutes.js';       // Phase 7: 客户管理 (2026-05-11)
import channelRoutes from './route/channelRoutes.js';       // Phase 8: 渠道管理 (2026-05-11)
import commerceRoutes from './route/commerceRoutes.js';     // Phase 8: 商品订单 (2026-05-11)
import campaignRoutes from './route/campaignRoutes.js';     // Phase 11: 运营活动管理 (2026-05-11)

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// 信任来自回环地址的反向代理（内部 embed 端点依赖 req.ip 鉴权）
app.set('trust proxy', 'loopback');

// 基础安全中间件
app.disable('x-powered-by');
app.use(helmet());
app.use(cspMiddleware);
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:3001').split(',').map(s => s.trim());
app.use(cors({
  credentials: true,
  origin: (origin, callback) => {
    // 允许无 Origin 的请求（服务端调用、Postman、curl）
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
}));

// 响应压缩
app.use(compression());

// Prometheus 指标采集
app.use(metricsMiddleware);

// 请求限流（全局限流 + 按需在各路由叠加严格限流）
app.use(apiLimiter);

// 解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// SQL 注入防护
app.use(sqlGuardMiddleware);

// 请求日志
app.use(requestLogger);

// 全链路追踪 — 注入 X-Correlation-Id (Phase 0-A, 2026-05-11)
app.use(correlationIdMiddleware);

// IP 白名单中间件 — 管理端路径 (Phase 0-A, 2026-05-11)
app.use(ipWhitelistMiddleware({ paths: ['/api/admin', '/api/ops'] }));

// CSRF Token 生成 (所有请求) — 必须在 csrfProtection 之前
app.use(setCsrfCookie);

// CSRF 双重提交 Cookie 防护 (POST/PUT/PATCH/DELETE)
app.use(csrfProtection);

// v4.1 统一认证 + 多租户上下文 + 审计日志中间件
// Phase 1 P0 修复：auth 跑在 tenantContext 前面，确保 req.tenantId 由 JWT payload 注入 (2026-05-08)
app.use(authMiddleware);
app.use(tenantContext);
app.use(auditLogMiddleware);

// 全局缓存失效：POST/PUT/DELETE 2xx 响应后自动清除对应 GET 缓存
import('./middleware/cache.js').then(({ invalidateCache }) => {
  app.use((req, res, next) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const basePath = req.baseUrl || req.originalUrl.split('?')[0];
        invalidateCache(`*:${basePath}*`).catch(() => {});
      }
    });
    next();
  });
}).catch(() => { /* cache middleware unavailable — cache invalidation disabled */ });

// 健康检查 — 使用网关健康仪表盘 (Phase 0-A, 2026-05-11)
app.get('/api/health', optionalAuth, async (req, res) => {
  const authenticated = !!req.user;
  const status = await runHealthCheck(authenticated);
  if (status.checks.db) {
    return success(res, status, status.degraded ? 'degraded' : 'ok');
  }
  return sendError(res, 503, 'db_down', status);
});

// 网关路由地图端点 (Phase 0-A, 2026-05-11) — 需管理员认证
app.get('/api/gateway/routes', authMiddleware, adminAuth, (req, res) => {
  return success(res, generateRouteMap(), 'ok');
});

// Prometheus 指标端点
app.get('/api/metrics', metricsEndpoint);

// 内部 Embedding 端点（仅 localhost，脚本调用）
const embedSchema = z.object({ texts: z.array(z.string().min(1).max(8000)).min(1).max(100) });
app.post('/api/internal/embed', async (req, res) => {
  if (req.ip !== '127.0.0.1' && req.ip !== '::1' && req.ip !== '::ffff:127.0.0.1') {
    return sendError(res, ERROR_CODE.FORBIDDEN, '仅限内部调用');
  }
  try {
    const parsed = embedSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, ERROR_CODE.BAD_REQUEST, parsed.error.errors[0]?.message || '参数校验失败');
    const { texts } = parsed.data;
    const apiKey = process.env.OPENAI_API_KEY || '';
    const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
    if (!apiKey) return sendError(res, ERROR_CODE.INTERNAL_ERROR, 'API key not configured');

    const fetchRes = await fetch(`${baseUrl}/embeddings`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: texts }),
      signal: AbortSignal.timeout(60000),
    });

    if (!fetchRes.ok) {
      const err = await fetchRes.json().catch(() => ({}));
      return sendError(res, fetchRes.status, err.error?.message || 'upstream error');
    }

    const data = await fetchRes.json();
    return success(res, { vectors: data.data.map(d => d.embedding), model: data.model }, 'ok');
  } catch (e) {
    return sendError(res, ERROR_CODE.INTERNAL_ERROR, e.status ? e.message : '嵌入服务异常');
  }
});

// 公开路由（无需认证）
app.use(geoRoutes);

// 静态文件服务（上传目录），带缓存
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: '7d',
  etag: true,
  lastModified: true,
  setHeaders(res, filepath) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (/\.(jpg|jpeg|png|gif|webp|svg|mp4|webm|mov)$/i.test(filepath)) {
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    }
  },
}));

// 路由注册
// v4.1 路由 (2026-05-08)
// v4.1 路由 (2026-05-08) — 认证限流 10次/分钟
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/config', apiLimiter, configPublicRouter);
app.use('/api/admin/config', adminLimiter, configAdminRouter);
app.use('/api/images', heavyLimiter, imageRoutesV4);
app.use('/api/ai', (req, res, next) => {
  if (req.path === '/enhance-prompt') return next();
  return sendError(res, ERROR_CODE.NOT_FOUND, 'Not Found');
}, heavyLimiter, imageRoutesV4);  // 仅放行 /api/ai/enhance-prompt
app.use('/api/detail', detailRoutesV4);
app.use('/api/videos', heavyLimiter, videoRoutesV4);
app.use('/api/jobs', jobRoutesV4);
app.use('/api/job', jobRoutesV4);   // 别名: useTaskPolling 轮询 /api/job/:id
app.use('/api/points', pointsRoutesV4);
app.use('/api/distribution', distributionRoutesV4);
app.use('/api/assets', assetsRoutesV4);
app.use('/api/compliance', complianceRoutesV4);
app.use('/api/platforms', platformBindRoutesV4);
app.use('/api/publish', publishRoutesV4);
app.use('/api/users', userRoutes);  // must precede /api/user to avoid prefix match
app.use('/api/user', userRoutesV4);
app.use('/api/upload', uploadLimiter, uploadRoutesV4);
app.use('/api/open', openApiRoutes);
app.use('/api/open/keys', adminLimiter, openApiKeyRoutes);
app.use('/api/copywriting', copywritingRoutes);
app.use('/api/templates', sizeTemplateRoutes);
app.use('/api/brand', brandRoutes);
// DEPRECATED v1 — v4 routes mounted above supersede these. Remove after v4 migration complete.
app.use('/api/images', heavyLimiter, imageRoutes);
app.use('/api/videos', heavyLimiter, videoRoutes);
app.use('/api/batch', heavyLimiter, batchRoutes);
app.use('/api/advanced', heavyLimiter, advancedImageRoutes);
app.use('/api/adv-video', heavyLimiter, advancedVideoRoutes);
app.use('/api/payment', paymentLimiter, paymentRoutes);
app.use('/api/plans', paymentRoutes); // 公开别名（查看套餐无需限流）
app.use('/api/admin', adminLimiter, adminRoutes);
app.use('/api/admin/models', adminLimiter, adminModelsRoutesV4);
app.use('/api/test', adminLimiter, testWorkbenchRoutesV4);
app.use('/api/posters', heavyLimiter, posterRoutesV4);
app.use('/api/video-translate', heavyLimiter, videoTranslateRoutesV4);
app.use('/api/cut-ecosystem', heavyLimiter, cutEcosystemRoutesV4);
app.use('/api/model', heavyLimiter, modelGenerateRoutesV4);
app.use('/api/render', heavyLimiter, renderRoutesV4);
app.use('/api/voice', heavyLimiter, voiceRoutesV4);
app.use('/api/3d', heavyLimiter, d3RoutesV4);
app.use('/api/notifications', notificationRoutes);
app.use('/api/sms', codeLimiter, smsRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/upload', uploadLimiter, uploadRoutes);
app.use('/api/prompts', promptRoutes);
app.use('/api/credits', creditRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/diy', diyRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/proxy', proxyRoutes);
app.use('/api/recharge', paymentLimiter, rechargeRoutes);
app.use('/api/allinpay', allinpayRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/admin/ai-logs', adminLimiter, aiLogRoutes);
app.use('/api/admin/audit-logs', adminLimiter, auditLogRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/help', helpRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/admin/site-config', siteConfigAdminRouter);
app.use('/api/admin/workspace-diy', adminLimiter, adminWorkspaceDiyRoutes);
app.use('/api/admin/geo-rules', adminLimiter, geoRuleAdminRouter);
app.use('/api/site-config/public', siteConfigPublicRouter);
app.use('/api/badges', adminLimiter, badgeRoutes);
app.use('/api/tier', apiLimiter, tierRoutes);
app.use('/api/admin/abuse', abuseRoutes);
app.use('/api/platforms', platformDetailRoutes);
app.use('/api/multilingual', multilingualRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/platform-specs', platformSpecRoutes);
app.use('/api/ai-dispatch', aiConcurrencyGuard, heavyLimiter, aiDispatchRoutes);  // 多模型统一调度: dispatch/categories/health/stats/cache
app.use('/api/ai/gateway', aiConcurrencyGuard, heavyLimiter, aiGatewayRoutes);  // Token 集约化中台: infer/dispatch/route/stats/pricing
app.use('/api/compare', heavyLimiter, compareRoutes);
app.use('/api/seo-keywords', heavyLimiter, seoKeywordRoutes);
app.use('/api/fab', heavyLimiter, fabRoutes);
app.use('/api/memory', heavyLimiter, memoryEmbedRoutes);
app.use('/api/digital-human', heavyLimiter, digitalHumanRoutesV4);
app.use('/api/platform-publish', apiLimiter, platformPublishRoutesV4);
app.use('/api/template-market', apiLimiter, templateMarketRoutesV4);
app.use('/api/sdk', heavyLimiter, sdkRoutes);
app.use('/api/adk', heavyLimiter, adkRoutes);

// ===== Phase 1: 企业/代理端 (2026-05-11) =====
app.use('/api/enterprise', enterpriseRoutes);
app.use('/api/enterprise/finance', financeRoutes);  // Phase 2: 财务核心
app.use('/api/enterprise/customers', customerRoutes); // Phase 7: 客户管理
app.use('/api/enterprise/channel', adminLimiter, channelRoutes);    // Phase 8: 渠道管理
app.use('/api/enterprise/commerce', adminLimiter, commerceRoutes);  // Phase 8: 商品订单
app.use('/api/admin/campaign', adminLimiter, campaignRoutes);        // Phase 11: 运营活动+优惠券+公告

// 404
app.use((_req, res) => {
  sendError(res, ERROR_CODE.NOT_FOUND, '接口不存在');
});

// 全局异常捕获
app.use((err, _req, res, _next) => {
  // 生产环境不记录完整堆栈，防止泄露服务器路径等敏感信息
  const logEntry = { message: err.message };
  if (process.env.NODE_ENV !== 'production') logEntry.stack = err.stack;
  logger.error('[Server Error]', logEntry);
  if (err instanceof BusinessError) {
    return sendError(res, err.status, err.message);
  }
  sendError(res, ERROR_CODE.INTERNAL_ERROR, '服务器内部错误');
});

export default app;
