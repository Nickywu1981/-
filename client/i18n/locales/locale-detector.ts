/**
 * Locale Detector for @nuxtjs/i18n
 * 优先级：Cookie > Accept-Language > IP Geo > default 'zh'
 */
export default defineI18nLocaleDetector((event, config) => {
  const locales = (config as any).locales as string[] || ['zh', 'en']
  // 1. Cookie 中用户手动选择的语言
  const cookie = parseCookies(event.headers.get('cookie') || '')
  if (cookie.movio_lang && locales.includes(cookie.movio_lang)) {
    return cookie.movio_lang
  }

  // 2. Accept-Language 请求头
  const acceptLang = event.headers.get('accept-language')
  if (acceptLang) {
    const detected = detectFromAcceptLanguage(acceptLang, locales)
    if (detected) return detected
  }

  // 3. IP 地理位置（从 x-geo-country 头读取，由反向代理注入）
  const country = event.headers.get('x-geo-country') || event.headers.get('cf-ipcountry')
  if (country) {
    const locale = countryToLocale(country, locales)
    if (locale) return locale
  }

  // 4. fallback
  return config.defaultLocale || 'zh'
})

/**
 * JSON cookie parser (避免引入额外依赖)
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const result: Record<string, string> = {}
  if (!cookieHeader) return result
  cookieHeader.split(';').forEach((pair) => {
    const idx = pair.indexOf('=')
    if (idx > 0) {
      result[pair.substring(0, idx).trim()] = decodeURIComponent(pair.substring(idx + 1).trim())
    }
  })
  return result
}

/**
 * 从 Accept-Language 提取最佳匹配
 */
function detectFromAcceptLanguage(header: string, supportedLocales: string[]): string | null {
  const entries = header
    .split(',')
    .map((entry) => {
      const [tag, qRaw] = entry.split(';q=')
      return { tag: tag.trim().split('-')[0], q: qRaw ? parseFloat(qRaw) : 1.0 }
    })
    .sort((a, b) => b.q - a.q)

  for (const entry of entries) {
    // 直接匹配
    if (supportedLocales.includes(entry.tag)) return entry.tag
    // 区域映射：zh-* → zh, es-* → es
    if (entry.tag === 'zh') return 'zh'
    if (supportedLocales.includes('en') && ['en'].includes(entry.tag)) return 'en'
    if (supportedLocales.includes('es') && ['es'].includes(entry.tag)) return 'es'
  }
  return null
}

/**
 * 国家代码 → 语言映射
 */
function countryToLocale(country: string, supported: string[]): string | null {
  const map: Record<string, string> = {
    CN: 'zh', TW: 'zh', HK: 'zh', SG: 'zh', MO: 'zh',
    US: 'en', GB: 'en', CA: 'en', AU: 'en', NZ: 'en', IE: 'en', IN: 'en', PH: 'en', NG: 'en', ZA: 'en',
    ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es', VE: 'es', EC: 'es', GT: 'es', CU: 'es',
    BO: 'es', DO: 'es', HN: 'es', PY: 'es', SV: 'es', NI: 'es', CR: 'es', PA: 'es', UY: 'es', GQ: 'es',
  }
  const locale = map[country.toUpperCase()]
  return locale && supported.includes(locale) ? locale : null
}
