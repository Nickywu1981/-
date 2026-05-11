export default defineLocaleDetector((event, config) => {
  const cookie = parseCookies(event)
  if (cookie.movio_lang && config.locales.includes(cookie.movio_lang)) {
    return cookie.movio_lang
  }
  const accept = getHeader(event, 'accept-language') || ''
  const zh = accept.includes('zh')
  return zh ? 'zh' : config.defaultLocale
})
