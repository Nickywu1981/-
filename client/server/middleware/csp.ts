export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const apiOrigin = (config.public?.apiBase || '').replace(/\/api\/?$/, '') || '*'
  const isDev = process.env.NODE_ENV !== 'production'

  const connectSrc = [
    "'self'",
    "wss:",
    "ws:",
    apiOrigin,
    ...(isDev ? ['http://localhost:3001', 'http://localhost:3000'] : []),
  ].join(' ')

  setResponseHeader(event, 'Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    `connect-src ${connectSrc}`,
    "media-src 'self'",
    "worker-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '))

  setResponseHeader(event, 'X-Content-Type-Options', 'nosniff')
  setResponseHeader(event, 'X-Frame-Options', 'DENY')
  setResponseHeader(event, 'X-XSS-Protection', '1; mode=block')
  setResponseHeader(event, 'Referrer-Policy', 'strict-origin-when-cross-origin')
  setResponseHeader(event, 'Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')

  if (getRequestProtocol(event) === 'https') {
    setResponseHeader(event, 'Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
})
