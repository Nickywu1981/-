/**
 * 健康检查端点 — 供 PM2 / Docker / K8s 探活
 * GET /api/health → { uptime, db, redis, memory }
 */
export function healthCheck(req, res) {

  res.json({
    code: 200,
    msg: 'ok',
    data: {
      status: 'healthy',
      uptime: Math.floor(process.uptime()),
      memory: {
        rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
        heap: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
      },
      env: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    },
  });
}

export default { healthCheck };
