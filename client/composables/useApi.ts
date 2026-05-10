import { useRuntimeConfig, navigateTo } from '#app';
import { ref } from 'vue';

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

// ==================== 离线检测 ====================

export const isOffline = ref(false);

// 401 重定向锁（防并发请求同时触发多次 navigateTo）
let isRedirecting = false;
let listenersInit = false;

function onOffline() { isOffline.value = true; }
function onOnline() { isOffline.value = false; }

function ensureListeners() {
  if (listenersInit || typeof window === 'undefined') return;
  window.addEventListener('offline', onOffline);
  window.addEventListener('online', onOnline);
  isOffline.value = !navigator.onLine;
  listenersInit = true;
}

// ==================== 重试配置 ====================

const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  statuses: [502, 503, 504],
};

async function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** 通用 API 请求封装（含重试 + 离线检测） */
async function request<T = any>(
  url: string,
  options: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'; body?: any; params?: Record<string, any> } = {},
  retries = 0,
): Promise<T> {
  if (isOffline.value) {
    throw new Error('网络已断开，请检查网络连接');
  }

  const config = useRuntimeConfig();
  const base = config.public.apiBase as string;
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

  try {
    const res = await $fetch<ApiResponse<T>>(`${fullUrl}${query}`, {
      method: options.method || 'GET',
      headers,
      body: options.body,
      credentials: 'include',
      onResponseError({ response }) {
        if (response.status === 401 && !isRedirecting) {
          isRedirecting = true;
          navigateTo('/login').finally(() => { isRedirecting = false; });
          // 兜底：5s 后强制解锁（防止 navigateTo 异常导致永久锁死）
          setTimeout(() => { isRedirecting = false; }, 5000);
        }
      },
    });

    if (res.code !== 200) {
      throw new Error(res.msg || '请求失败');
    }
    return res.data as T;
  } catch (err: any) {
    // 5xx 重试（指数退避）
    const status = err?.response?.status || err?.status;
    if (RETRY_CONFIG.statuses.includes(status) && retries < RETRY_CONFIG.maxRetries) {
      const waitMs = RETRY_CONFIG.baseDelayMs * Math.pow(2, retries);
      await delay(waitMs);
      return request<T>(url, options, retries + 1);
    }
    throw err;
  }
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

/** Composable wrapper for pages that import { useApi } */
export function useApi() {
  ensureListeners();
  return api;
}
