/**
 * Prometheus 指标采集中间件
 *
 * 暴露 /metrics 端点给 Prometheus 抓取
 * 采集: HTTP QPS、响应耗时、状态码分布、队列积压
 */
import { success } from '../utils/response.js';
import logger from '../utils/logger.js';

// ========================= 指标存储 =========================

const metrics = {
  http_requests_total: {},       // method + path + status → count
  http_request_duration_ms: {},  // method + path → sum + count
  queue_size: {},                // queue name → size
  active_users: 0,
  db_pool_size: 0,
};

// ========================= HTTP 指标中间件 =========================

export function metricsMiddleware(req, res, next) {
  const start = Date.now();

  // 记录请求
  const origEnd = res.end;
  res.end = function (...args) {
    const duration = Date.now() - start;
    const method = req.method;
    const path = req.route?.path || req.path || 'unknown';

    // 请求总数
    const key = `${method} ${path} ${res.statusCode}`;
    metrics.http_requests_total[key] = (metrics.http_requests_total[key] || 0) + 1;

    // 响应耗时
    const durKey = `${method} ${path}`;
    if (!metrics.http_request_duration_ms[durKey]) {
      metrics.http_request_duration_ms[durKey] = { sum: 0, count: 0 };
    }
    metrics.http_request_duration_ms[durKey].sum += duration;
    metrics.http_request_duration_ms[durKey].count += 1;

    origEnd.apply(this, args);
  };

  next();
}

// ========================= Metrics 端点 =========================

export function metricsEndpoint(req, res) {
  // 计算实时 DB 连接池大小
  try {
    import('../dao/db.js').then(m => {
      const pool = m.default;
      if (pool?._allConnections) {
        metrics.db_pool_size = pool._allConnections.length;
      }
    }).catch(err => logger.warn('[Metrics] db pool read failed', { error: err.message }));
  } catch { /* noop */ }

  // 序列化为 Prometheus 格式
  const lines = ['# HELP http_requests_total Total HTTP requests', '# TYPE http_requests_total counter'];
  for (const [key, val] of Object.entries(metrics.http_requests_total)) {
    lines.push(`http_requests_total{${formatLabels(key)}} ${val}`);
  }

  lines.push('# HELP http_request_duration_ms HTTP request duration in ms', '# TYPE http_request_duration_ms summary');
  for (const [key, val] of Object.entries(metrics.http_request_duration_ms)) {
    const avg = val.count > 0 ? Math.round(val.sum / val.count) : 0;
    lines.push(`http_request_duration_ms_sum{${formatLabels(key)}} ${val.sum}`);
    lines.push(`http_request_duration_ms_count{${formatLabels(key)}} ${val.count}`);
    lines.push(`http_request_duration_ms_avg{${formatLabels(key)}} ${avg}`);
  }

  lines.push('# HELP db_pool_size Current DB connection pool size', '# TYPE db_pool_size gauge');
  lines.push(`db_pool_size ${metrics.db_pool_size}`);

  res.set('Content-Type', 'text/plain; charset=utf-8');
  return res.send(lines.join('\n') + '\n');
}

function formatLabels(input) {
  // "GET /api/users/login 200" → 'method="GET",path="/api/users/login",status="200"'
  const parts = input.split(' ');
  if (parts.length >= 3) {
    return `method="${parts[0]}",path="${parts[1]}",status="${parts[2]}"`;
  }
  return `label="${input}"`;
}

// ========================= 健康检查增强 =========================

export function healthCheckEndpoint(req, res) {
  const checks = {
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
    node: process.version,
    env: process.env.NODE_ENV || 'development',
  };
  return success(res, checks);
}

export default { metricsMiddleware, metricsEndpoint, healthCheckEndpoint };
