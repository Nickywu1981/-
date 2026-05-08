export default defineEventHandler((event) => {
  setResponseHeader(event, 'Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: http://localhost:*",
    "font-src 'self'",
    "connect-src 'self' http://localhost:*",
    "media-src 'self'",
  ].join('; '))
  setResponseHeader(event, 'X-Content-Type-Options', 'nosniff')
  setResponseHeader(event, 'X-Frame-Options', 'DENY')
  setResponseHeader(event, 'X-XSS-Protection', '1; mode=block')
  setResponseHeader(event, 'Referrer-Policy', 'strict-origin-when-cross-origin')
})
