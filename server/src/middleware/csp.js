/**
 * CSP 安全头中间件
 * - Content-Security-Policy
 * - X-Content-Type-Options: nosniff
 * - X-Frame-Options: DENY
 * - Referrer-Policy: strict-origin-when-cross-origin
 */
import { isProduction } from '../config/index.js';

export default function cspMiddleware(req, res, next) {
  // Strict-Transport-Security (生产环境无条件设置，开发/测试仅 HTTPS)
  if (isProduction || req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  // Content-Security-Policy
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' cdn.jsdelivr.net cdnjs.cloudflare.com unpkg.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' ws: wss: http: https:",
      "media-src 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  );

  // 禁止 MIME 类型嗅探
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // 禁止被 iframe 嵌入
  res.setHeader('X-Frame-Options', 'DENY');

  // 跨域 Referrer 策略
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // 权限策略 — 禁用敏感设备 API
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');

  next();
}
