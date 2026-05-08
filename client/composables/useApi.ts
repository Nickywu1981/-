import { useRuntimeConfig, navigateTo } from '#app';

interface ApiResponse<T = any> {
  code: number;
  msg: string;
  data: T;
}

interface PaginatedData<T = any> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** 通用 API 请求封装 */
async function request<T = any>(
  url: string,
  options: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'; body?: any; params?: Record<string, any> } = {},
): Promise<T> {
  const config = useRuntimeConfig();
  const base = config.public.apiBase || '/api';
  const fullUrl = url.startsWith('http') ? url : `${base}${url}`;

  const headers: Record<string, string> = {};

  // Build query string from params
  let query = '';
  if (options.params) {
    const searchParams = new URLSearchParams();
    Object.entries(options.params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        searchParams.append(k, String(v));
      }
    });
    const qs = searchParams.toString();
    if (qs) query = `?${qs}`;
  }

  const res = await $fetch<ApiResponse<T>>(`${fullUrl}${query}`, {
    method: options.method || 'GET',
    headers,
    body: options.body,
    credentials: 'include',
    onResponseError({ response }) {
      if (response.status === 401) {
        navigateTo('/login');
      }
    },
  });

  if (res.code !== 200) {
    throw new Error(res.msg || '请求失败');
  }
  return res.data as T;
}

/** API 方法快捷调用 */
export const api = {
  get: <T = any>(url: string, params?: Record<string, any>) =>
    request<T>(url, { params }),

  post: <T = any>(url: string, body?: any) =>
    request<T>(url, { method: 'POST', body }),

  put: <T = any>(url: string, body?: any) =>
    request<T>(url, { method: 'PUT', body }),

  delete: <T = any>(url: string) =>
    request<T>(url, { method: 'DELETE' }),
};

/** 用户相关 API */
export const userApi = {
  login: (data: { username: string; password: string }) =>
    api.post('/auth/login', data),
  register: (data: any) => api.post('/auth/register', data),
  profile: () => api.get('/user/profile'),
  updateProfile: (data: any) => api.put('/user/profile', data),
  stats: () => api.get('/user/stats'),
};

/** 管理后台 API */
export const adminApi = {
  dashboard: () => api.get('/admin/stats'),
  users: (params?: any) => api.get('/admin/users', params),
  tasks: (params?: any) => api.get('/admin/tasks', params),
  orders: (params?: any) => api.get('/admin/orders', params),
  plans: (params?: any) => api.get('/admin/plans', params),
  prompts: (params?: any) => api.get('/admin/prompts', params),
  credits: (params?: any) => api.get('/admin/credits', params),
  moderation: {
    list: (params?: any) => api.get('/admin/sensitive-words', params),
    add: (word: string) => api.post('/admin/sensitive-words', { word }),
    remove: (id: number) => api.delete(`/admin/sensitive-words/${id}`),
  },
};

export type { ApiResponse, PaginatedData };
export default api;
