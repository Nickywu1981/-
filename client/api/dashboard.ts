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
    api.get<DashboardSummary>('/ai/gateway/monitor/dashboard', { hours }),

  modelBreakdown: () =>
    api.get('/ai/gateway/monitor/models'),

  timeSeries: (hours?: number) =>
    api.get('/ai/gateway/monitor/timeseries', { hours }),

  topUsers: (limit?: number) =>
    api.get('/ai/gateway/monitor/top-users', { limit }),
}
