/**
 * Auth 模块 API
 */
import { api } from '~/composables/useApi'

export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    api.post('/auth/login', credentials),

  logout: () =>
    api.post('/auth/logout'),

  profile: () =>
    api.get('/auth/profile'),

  refreshToken: () =>
    api.post('/auth/refresh'),
}
