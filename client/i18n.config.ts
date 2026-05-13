export default defineI18nConfig(() => ({
  legacy: false,
  locale: 'zh',
  fallbackLocale: {
    // 西班牙语翻译不完整时先用英语兜底（再不行才用中文）
    es: ['en', 'zh'],
    en: ['zh'],
    default: 'zh',
  },
}))
