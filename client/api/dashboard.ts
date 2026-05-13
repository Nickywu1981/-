/**
 * Dashboard 模块 API
 */
import { api } from '~/composables/useApi'

export interface DashboardSummary {
  users: number
  orders: number
  revenue: number
  commission: number
  [key: string]: unknown
}

export const dashboardApi = {
  summary: (hours?: number) =>
    api.get<DashboardSummary>('/ai/gateway/dashboard', { hours }),

  modelBreakdown: () =>
    api.get('/ai/gateway/models'),

  timeSeries: (hours?: number) =>
    api.get('/ai/gateway/timeseries', { hours }),

  topUsers: (limit?: number) =>
    api.get('/ai/gateway/top-users', { limit }),
}
