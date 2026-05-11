import { useRuntimeConfig, navigateTo } from '#app';
import { ref } from 'vue';
import { REDIRECT_UNLOCK_MS } from '~/constants/ui'

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

// ==================== CSRF 工具 ====================

function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return match ? match[1] : null;
}

// ==================== 离线检测 ====================

const isOffline = ref(false);

// 401 重定向锁（防并发请求同时触发多次 navigateTo）
let isRedirecting = false;
let redirectTimer: ReturnType<typeof setTimeout> | null = null;
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

  // CSRF 双重提交 Cookie 模式: 读取 csrf_token → X-CSRF-Token 请求头
  if (options.method && options.method !== 'GET') {
    const csrfToken = getCsrfToken();
    if (csrfToken) headers['x-csrf-token'] = csrfToken;
  }

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
          if (redirectTimer) clearTimeout(redirectTimer);
          redirectTimer = setTimeout(() => { isRedirecting = false; redirectTimer = null; }, REDIRECT_UNLOCK_MS);
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

export type { ApiResponse, PaginatedData };

let activeInstances = 0;

/** Composable wrapper for pages that import { useApi } */
export function useApi() {
  ensureListeners();
  activeInstances++;

  onUnmounted(() => {
    activeInstances--;
    if (activeInstances <= 0 && typeof window !== 'undefined') {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
      if (redirectTimer) { clearTimeout(redirectTimer); redirectTimer = null; }
      isRedirecting = false;
      listenersInit = false;
      activeInstances = 0;
    }
  });

  return api;
}
