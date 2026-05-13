/**
 * Work 模块 API
 *
 * 覆盖 /api/work/* 路由
 */
import { api, type PaginatedData } from '~/composables/useApi'

export interface WorkItem {
  id: string
  title: string
  status: string
  type: string
  createdAt: string
  updatedAt: string
  [key: string]: unknown
}

export const workApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<PaginatedData<WorkItem>>('/work/list', params),

  detail: (id: string) =>
    api.get<WorkItem>(`/work/detail/${id}`),

  create: (body: Record<string, unknown>) =>
    api.post<WorkItem>('/work/create', body),

  update: (id: string, body: Record<string, unknown>) =>
    api.put<WorkItem>(`/work/update/${id}`, body),

  delete: (id: string) =>
    api.delete<void>(`/work/delete/${id}`),

  batch: (body: { ids: string[]; action: string }) =>
    api.post('/work/batch', body),

  publish: (id: string, body?: Record<string, unknown>) =>
    api.post(`/work/publish/${id}`, body),
}
