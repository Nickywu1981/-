export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const apiOrigin = (config.public?.apiBase || '').replace(/\/api\/?$/, '') || '*'

  setResponseHeader(event, 'Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${apiOrigin} *`,
    "font-src 'self'",
    `connect-src 'self' ${apiOrigin}`,
    "media-src 'self'",
  ].join('; '))
  setResponseHeader(event, 'X-Content-Type-Options', 'nosniff')
  setResponseHeader(event, 'X-Frame-Options', 'DENY')
  setResponseHeader(event, 'X-XSS-Protection', '1; mode=block')
  setResponseHeader(event, 'Referrer-Policy', 'strict-origin-when-cross-origin')
  if (getRequestProtocol(event) === 'https') {
    setResponseHeader(event, 'Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
})
