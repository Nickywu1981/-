/**
 * CSP 安全头中间件
 * - Content-Security-Policy
 * - X-Content-Type-Options: nosniff
 * - X-Frame-Options: DENY
 * - Referrer-Policy: strict-origin-when-cross-origin
 */
export default function cspMiddleware(req, res, next) {
  // Strict-Transport-Security (仅 HTTPS)
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  // Content-Security-Policy
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'strict-dynamic' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' ws: wss:",
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

  next();
}
