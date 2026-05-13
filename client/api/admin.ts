/**
 * Admin 模块 API
 */
import { api } from '~/composables/useApi'

export const adminApi = {
  i18n: {
    list: (locale: string) =>
      api.get<Record<string, unknown>>(`/admin/i18n/${locale}/admin`),

    search: (locale: string, query: string) =>
      api.get(`/admin/i18n/${locale}/search`, { q: query }),

    logs: (locale: string, key: string) =>
      api.get(`/admin/i18n/${locale}/logs/${encodeURIComponent(key)}`),
  },

  config: {
    get: (groupKey: string) =>
      api.get(`/config/${groupKey}`),

    dict: (dictKey: string) =>
      api.get(`/config/dict/${dictKey}`),
  },
}
