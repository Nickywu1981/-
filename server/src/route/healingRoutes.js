/**
 * L5 自愈系统管理路由
 * 端点: /api/admin/healing/*
 */
import { Router } from 'express';
import { authMiddleware, adminAuth } from '../middleware/auth.js';
import { success, error as sendError } from '../utils/response.js';
import logger from '../utils/logger.js';

const router = Router();
router.use(authMiddleware, adminAuth);

// GET /api/admin/healing/incidents — 事件列表
router.get('/incidents', async (req, res, next) => {
  try {
    const { listIncidents } = await import('../dao/healingIncidentDao.js');
    const { limit = 50, offset = 0, days = 7, type } = req.query;
    const incidents = await listIncidents({ incidentType: type, limit: Number(limit), offset: Number(offset), days: Number(days) });
    success(res, incidents);
  } catch (e) { next(e); }
});

// GET /api/admin/healing/patterns — 学习到的模式
router.get('/patterns', async (req, res, next) => {
  try {
    const { extractRecurringPatterns } = await import('../services/incidentLearningService.js');
    const patterns = await extractRecurringPatterns(req.query.days ? Number(req.query.days) : 30);
    success(res, patterns);
  } catch (e) { next(e); }
});

// GET /api/admin/healing/strategies — 策略排名
router.get('/strategies', async (req, res, next) => {
  try {
    const { rankStrategies } = await import('../services/incidentLearningService.js');
    const strategies = await rankStrategies(req.query.type || null);
    success(res, strategies);
  } catch (e) { next(e); }
});

// POST /api/admin/healing/strategies/:id/evolve — 手动触发策略进化
router.post('/strategies/:id/evolve', async (req, res, next) => {
  try {
    const { evolveStrategy } = await import('../services/incidentLearningService.js');
    const result = await evolveStrategy(req.params.id);
    success(res, result);
  } catch (e) { next(e); }
});

// POST /api/admin/healing/evolution-tick — 手动触发进化扫描
router.post('/evolution-tick', async (req, res, next) => {
  try {
    const { evolutionTick } = await import('../services/incidentLearningService.js');
    const result = await evolutionTick();
    success(res, result);
  } catch (e) { next(e); }
});

// GET /api/admin/healing/thresholds — 查看阈值
router.get('/thresholds', async (req, res, next) => {
  try {
    const { getAllThresholds } = await import('../services/adaptiveThresholdService.js');
    success(res, getAllThresholds());
  } catch (e) { next(e); }
});

// PUT /api/admin/healing/thresholds/:key — 手动调整阈值
router.put('/thresholds/:key', (req, res, next) => {
  try {
    import('../services/adaptiveThresholdService.js').then(({ setThreshold, getThreshold }) => {
      setThreshold(req.params.key, req.body.value);
      success(res, getThreshold(req.params.key));
    }).catch(next);
  } catch (e) { next(e); }
});

// GET /api/admin/healing/thresholds/baseline — 触发基线学习
router.post('/thresholds/baseline', async (req, res, next) => {
  try {
    const { learnBaseline } = await import('../services/adaptiveThresholdService.js');
    const baseline = await learnBaseline(req.body.days || 7);
    success(res, baseline);
  } catch (e) { next(e); }
});

// GET /api/admin/healing/predict — 故障预测
router.get('/predict', async (req, res, next) => {
  try {
    const { getRecoveryMetrics } = await import('../services/autoRecoveryService.js');
    const { aggregateAlerts } = await import('../services/rootCauseService.js');
    const { getRedisMetrics } = await import('../dao/redis.js');

    const metrics = await getRecoveryMetrics();
    const redisMetrics = getRedisMetrics();

    const result = aggregateAlerts(
      { errorRate: metrics.openBreakers / Math.max(metrics.activeBreakers, 1), avgLatencyMs: 0 },
      { openCount: metrics.openBreakers },
      { down: !redisMetrics.ready, highLatency: redisMetrics.avgLatencyMs },
      { down: false, activeConnections: metrics.poolMetrics?.active || 0, connectionLimit: 20 },
    );
    success(res, { prediction: result, metrics, redisMetrics });
  } catch (e) { next(e); }
});

// GET /api/admin/healing/dashboard — 自愈仪表盘摘要
router.get('/dashboard', async (req, res, next) => {
  try {
    const { getRecoveryMetrics } = await import('../services/autoRecoveryService.js');
    const { extractRecurringPatterns } = await import('../services/incidentLearningService.js');
    const { getAllThresholds } = await import('../services/adaptiveThresholdService.js');

    const [recoveryMetrics, patterns, thresholds] = await Promise.all([
      getRecoveryMetrics(),
      extractRecurringPatterns(7),
      Promise.resolve(getAllThresholds()),
    ]);

    success(res, { recoveryMetrics, patterns, thresholds });
  } catch (e) { next(e); }
});

export default router;
