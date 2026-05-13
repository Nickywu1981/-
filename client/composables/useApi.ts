import type { Ref } from 'vue'
import { REDIRECT_UNLOCK_MS } from '~/constants/ui'

// ==================== 错误码 → i18n key 映射表 ====================
// 与 server/src/constants/errorCode.js FRONTEND_I18N_KEY 保持同步
const ERROR_I18N_MAP: Record<number, string> = {
  400: 'bad_request',
  401: 'unauthorized',
  402: 'payment_required',
  403: 'forbidden',
  404: 'not_found',
  500: 'internal_error',
  // 用户
  4001: 'user_exists',
  4002: 'user_not_found',
  4003: 'password_wrong',
  4004: 'token_expired',
  4005: 'token_invalid',
  4006: 'account_disabled',
  4007: 'token_expired',       // EC_AUTH_002
  4008: 'refresh_token_expired',
  4009: 'refresh_token_invalid',
  // 权限细分
  4010: 'admin_required',      // EC_AUTH_003
  4011: 'editor_required',     // EC_AUTH_004
  4012: 'super_admin_required', // EC_AUTH_005
  4013: 'enterprise_only',     // EC_AUTH_006
  4014: 'consumer_only',       // EC_AUTH_007
  4015: 'agent_only',          // EC_AUTH_008
  4016: 'no_token',            // EC_AUTH_009
  4017: 'token_revoked',       // EC_AUTH_010
  // CSRF
  4020: 'csrf_missing',        // EC_CSRF_001
  4021: 'csrf_mismatch',       // EC_CSRF_002
  // 限流
  4030: 'concurrency',         // EC_RATE_CONCURRENCY
  4031: 'general',             // EC_RATE_GENERAL
  4032: 'auth',                // EC_RATE_AUTH
  4033: 'code',                // EC_RATE_CODE
  4034: 'verify',              // EC_RATE_VERIFY
  4035: 'heavy',               // EC_RATE_HEAVY
  4036: 'upload',              // EC_RATE_UPLOAD
  4037: 'payment',             // EC_RATE_PAYMENT
  4038: 'admin',               // EC_RATE_ADMIN
  4039: 'e2b',                 // EC_RATE_E2B
  4040: 'e2b_exec',            // EC_RATE_E2B_EXEC
  4041: 'e2b_read',            // EC_RATE_E2B_READ
  4042: 'e2b_delete',          // EC_RATE_E2B_DELETE
  // 资源
  4101: 'not_found',           // RESOURCE_NOT_FOUND
  4102: 'resource_duplicate',
  4103: 'quota_exceeded',
  // 参数
  4201: 'param_missing',
  4202: 'param_invalid',
  4203: 'param_error',
  // 支付
  4301: 'order_not_found',
  4302: 'order_expired',
  4303: 'sign_failed',
  4304: 'channel_error',
  4305: 'amount_mismatch',
  4306: 'callback_failed',
};

/** 将错误码翻译为当前 locale 的 i18n 消息，失败时回退到 server msg */
function translateErrorCode(code: number, serverMsg: string): string {
  try {
    const nuxtApp = useNuxtApp();
    const i18nKey = ERROR_I18N_MAP[code];
    if (i18nKey && nuxtApp.$i18n) {
      const translated = nuxtApp.$i18n.t(`common.error_codes.${i18nKey}`);
      if (translated && translated !== `common.error_codes.${i18nKey}`) {
        return translated;
      }
    }
  } catch {}
  return serverMsg || 'Request failed';
}

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
    throw new ApiError('Network disconnected', 0, 0);
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
      throw new ApiError(translateErrorCode(res.code, res.msg || ''), res.code, 200, res.data);
    }
    return res.data as T;
  } catch (err: unknown) {
    const e = err as { name?: string; message?: string; data?: { msg?: string } };
    // 超时不重试
    if (e.name === 'TimeoutError' || e.name === 'AbortError') {
      if (options.signal?.aborted) throw e; // 外部取消，透传
      throw new ApiError('Request timeout', 408, 408);
    }

    // 5xx 指数退避重试
    const status = e?.response?.status || e?.status;
    if (RETRY_CONFIG.statuses.includes(status) && retries < RETRY_CONFIG.maxRetries) {
      const waitMs = RETRY_CONFIG.baseDelayMs * Math.pow(2, retries);
      await delay(waitMs);
      return request<T>(url, options, retries + 1);
    }

    // 已是 ApiError 则直接抛出
    if (e instanceof ApiError) throw e;

    throw new ApiError(
      e?.message || 'Network request failed',
      e?.response?.status || 500,
      e?.response?.status || 500,
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
