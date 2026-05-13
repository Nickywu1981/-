import type { Ref } from 'vue'
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

export class ApiError extends Error {
  code: number
  status: number
  data: any
  constructor(message: string, code = 500, status = 500, data?: any) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.data = data
  }
}

// ==================== CSRF 工具 ====================

function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return match ? match[1] : null;
}

// ==================== 离线检测 ====================

let _isOffline: Ref<boolean> | null = null;
function getIsOffline(): Ref<boolean> {
  if (!_isOffline) _isOffline = ref(false);
  return _isOffline;
}

// 401 重定向锁（防并发请求同时触发多次 navigateTo）
let isRedirecting = false;
let redirectTimer: ReturnType<typeof setTimeout> | null = null;
let listenersInit = false;

function onOffline() { getIsOffline().value = true; }
function onOnline() { getIsOffline().value = false; }

function ensureListeners() {
  if (listenersInit || typeof window === 'undefined') return;
  const off = getIsOffline();
  window.addEventListener('offline', onOffline);
  window.addEventListener('online', onOnline);
  off.value = !navigator.onLine;
  listenersInit = true;
}

// ==================== 重试配置 ====================

const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  statuses: [502, 503, 504],
};

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

const DEFAULT_TIMEOUT_MS = 30000;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  body?: any
  params?: Record<string, any>
  timeout?: number
  signal?: AbortSignal
}

/** 通用 API 请求封装（含 CSRF + 超时 + 重试 + 离线检测 + 401 重定向锁） */
async function request<T = any>(
  url: string,
  options: RequestOptions = {},
  retries = 0,
): Promise<T> {
  if (getIsOffline().value) {
    throw new ApiError('网络已断开，请检查网络连接', 0, 0);
  }

  const config = useRuntimeConfig();
  const base = config.public.apiBase as string;
  const fullUrl = url.startsWith('http') ? url : `${base}${url}`;

  const headers: Record<string, string> = {};

  // CSRF: 非 GET 请求读取 csrf_token cookie → X-CSRF-Token 请求头
  if (options.method && options.method !== 'GET') {
    const csrfToken = getCsrfToken();
    if (csrfToken) headers['x-csrf-token'] = csrfToken;
  }

  // Query string
  let query = '';
  if (options.params) {
    const sp = new URLSearchParams();
    Object.entries(options.params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') sp.append(k, String(v));
    });
    const qs = sp.toString();
    if (qs) query = `?${qs}`;
  }

  // AbortController: 外部 signal + 内部 timeout 竞速
  const timeoutMs = options.timeout ?? DEFAULT_TIMEOUT_MS;
  const internalCtrl = new AbortController();
  const timeoutId = setTimeout(() => internalCtrl.abort(new DOMException('请求超时', 'TimeoutError')), timeoutMs);
  const combinedSignal = options.signal
    ? anySignal([options.signal, internalCtrl.signal])
    : internalCtrl.signal;

  try {
    const res = await $fetch<ApiResponse<T>>(`${fullUrl}${query}`, {
      method: options.method || 'GET',
      headers,
      body: options.body,
      credentials: 'include',
      signal: combinedSignal,
      onResponseError({ response }) {
        if (response.status === 401 && !isRedirecting) {
          isRedirecting = true;
          const redirectPath = typeof window !== 'undefined'
            ? window.location.pathname + window.location.search
            : '';
          if (redirectTimer) clearTimeout(redirectTimer);
          redirectTimer = setTimeout(() => { isRedirecting = false; redirectTimer = null; }, REDIRECT_UNLOCK_MS);
          navigateTo(`/login?redirect=${encodeURIComponent(redirectPath)}`)
            .finally(() => { isRedirecting = false; });
        }
      },
    });

    if (res.code !== 200) {
      throw new ApiError(res.msg || '请求失败', res.code, 200, res.data);
    }
    return res.data as T;
  } catch (err: any) {
    // 超时不重试
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      if (options.signal?.aborted) throw err; // 外部取消，透传
      throw new ApiError('请求超时，请稍后重试', 408, 408);
    }

    // 5xx 指数退避重试
    const status = err?.response?.status || err?.status;
    if (RETRY_CONFIG.statuses.includes(status) && retries < RETRY_CONFIG.maxRetries) {
      const waitMs = RETRY_CONFIG.baseDelayMs * Math.pow(2, retries);
      await delay(waitMs);
      return request<T>(url, options, retries + 1);
    }

    // 已是 ApiError 则直接抛出
    if (err instanceof ApiError) throw err;

    throw new ApiError(
      err?.message || '网络请求失败',
      err?.response?.status || 500,
      err?.response?.status || 500,
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/** 合并多个 AbortSignal */
function anySignal(signals: AbortSignal[]): AbortSignal {
  const ctrl = new AbortController();
  for (const s of signals) {
    if (s.aborted) { ctrl.abort(s.reason); return ctrl.signal; }
    s.addEventListener('abort', () => ctrl.abort(s.reason), { once: true });
  }
  return ctrl.signal;
}

/** API 方法快捷调用 */
export const api = {
  get: <T = any>(url: string, params?: Record<string, any>, opts?: Omit<RequestOptions, 'method' | 'params'>) =>
    request<T>(url, { ...opts, params }),

  post: <T = any>(url: string, body?: any, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(url, { ...opts, method: 'POST', body }),

  put: <T = any>(url: string, body?: any, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(url, { ...opts, method: 'PUT', body }),

  delete: <T = any>(url: string, opts?: Omit<RequestOptions, 'method'>) =>
    request<T>(url, { ...opts, method: 'DELETE', ...opts }),
};

export type { ApiResponse, PaginatedData };

let activeInstances = 0;

/** Composable wrapper — 自动管理离线监听器生命周期 */
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
