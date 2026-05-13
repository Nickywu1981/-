/**
 * Unified API Layer — Barrel Export
 *
 * 所有前端 API 调用统一入口，替换散落在各 composable/page 中的裸 $fetch 调用。
 *
 * 用法:
 *   import { api } from '~/api'
 *   const data = await api.get('/work/list', { page: 1 })
 *   const res  = await api.post('/work/create', { title: '...' })
 */

// 核心请求客户端（含重试 + 离线检测 + CSRF + 401 重定向锁）
export { api, useApi, type ApiResponse, type PaginatedData } from '~/composables/useApi'

// 领域 API 模块（按模块划分，渐进迁移）
export { workApi } from './work'
export { dashboardApi } from './dashboard'
export { adminApi } from './admin'
export { authApi } from './auth'
