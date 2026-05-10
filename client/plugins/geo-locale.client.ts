/**
 * Geo-IP 语言自动检测插件
 * 首次访问时调用后端地理定位 API，自动设置语言
 * 优先级：localStorage > Cookie > IP 检测 > 默认 zh
 */
export default defineNuxtPlugin(async () => {
  const { locale } = useI18n()

  // 已有手动选择 → 跳过自动检测
  if (typeof window !== 'undefined' && localStorage.getItem('lang')) return

  try {
    const res = await $fetch<{ locale: string; country: string; source: string }>('/api/geo/suggest-locale')
    if (res?.locale && ['zh', 'en', 'es'].includes(res.locale)) {
      locale.value = res.locale as 'zh' | 'en'
      localStorage.setItem('lang', res.locale)
    }
  } catch (err: any) {
    console.debug('[geo-locale] 地理位置API不可用，保持默认语言', err?.message || err)
  }
})
