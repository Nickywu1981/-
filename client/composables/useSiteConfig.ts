/**
 * Movio AI v4.1 — useSiteConfig
 * G4 前端开发 | 配置化三件套之一
 *
 * 从后端获取配置组, 支持降级默认文案 + SSE 热更新
 *
 * 用法:
 *   const { config, loading, error, isFallback } = useSiteConfig('page.home.hero')
 *   // config.title, config.subtitle, config.btn_start ...
 */
// ---------------------------------------------------------------------------
// 内置降级默认文案 (当后端 API 不可用时使用)
// ---------------------------------------------------------------------------
const FALLBACKS: Record<string, Record<string, string>> = {
  'page.home.hero': {
    title: 'Movio AI 电商智能体助手',
    subtitle: 'AI图片处理 · AI短视频创作 · 长视频智能剪辑 · AI数字人',
    slogan: '一键生成电商素材，让AI为你工作',
    btn_start: '开始创作',
    btn_video: '视频创作',
    btn_image: '图片创作',
    btn_detail: '详情图创作',
    upload_cta: '拖拽或点击上传素材',
  },
  'page.auth.login': {
    page_title: '登录 Movio AI',
    subtitle: '欢迎回来，继续您的AI创作之旅',
    btn_login: '登录',
    btn_register: '还没有账号？立即注册',
  },
  'page.auth.register': {
    page_title: '注册 Movio AI',
    subtitle: '开启您的AI电商创作之旅',
    btn_submit: '注册',
    btn_to_login: '已有账号？去登录',
  },
  'page.home.dashboard': {
    title: '用量概览',
    points_label: '剩余积分',
    tasks_today: '今日任务',
    completed_label: '已完成',
    empty_state: '暂无创作记录，快去试试吧',
    recent_works: '最近作品',
  },
  'comp.upload': {
    btn_select: '选择文件',
    btn_upload: '开始上传',
    drag_hint: '拖拽文件到此处或点击选择',
    uploading: '上传中...',
    upload_success: '上传成功',
    upload_error: '上传失败，请重试',
    resume_hint: '检测到未完成的上传，是否继续？',
  },
  'comp.task': {
    status_queued: '排队中，前方 {n} 个任务',
    status_processing: '处理中...',
    status_completed: '处理完成',
    status_failed: '处理失败',
    btn_retry: '重试',
    btn_download: '下载',
    submit_lock_hint: '任务进行中，请等待完成后再提交',
  },
  'comp.empty': {
    no_data: '暂无数据',
    no_result: '暂无结果',
    no_work: '暂无作品，快去创作吧',
  },
  'nav.sidebar': {
    label_home: '工作台',
    label_video: '视频创作',
    label_image: '图片创作',
    label_detail: '详情图',
    label_assets: '素材库',
    label_distribution: '分发管理',
    label_member: '会员中心',
    label_admin: '管理后台',
    label_config: '配置中心',
  },
  'sys.theme': {
    primary_color: '#4F46E5',
    success_color: '#10B981',
    warning_color: '#F59E0B',
    error_color: '#EF4444',
    font_size_base: '14',
    border_radius: '8',
  },
}

const cache: Record<string, any> = {}

// ── SSE 连接池：所有 useSiteConfig 调用共享一个 EventSource ──
let sharedEventSource: EventSource | null = null;
let sseRefCount = 0;
const sseListeners = new Map<string, () => void>();

function ensureSSE() {
  if (sharedEventSource || import.meta.server) return;
  try {
    sseRefCount++;
    sharedEventSource = new EventSource('/api/config/version/stream');
    sharedEventSource.onmessage = (e) => {
      let data: any
      try { data = JSON.parse(e.data) } catch { return }
      if (data.version && !data.heartbeat) {
        // 通知所有注册的监听器（各自清缓存 + 刷新）
        sseListeners.forEach(fn => fn());
      }
    };
  } catch { /* SSE not available */ }
}

function teardownSSE() {
  sseRefCount = Math.max(0, sseRefCount - 1)
  if (sseRefCount === 0 && sharedEventSource) {
    sharedEventSource.close();
    sharedEventSource = null;
  }
}

export function useSiteConfig(groupKey: string) {
  const config = ref<Record<string, string>>(cache[groupKey] || {})
  const loading = ref(!cache[groupKey])
  const error = ref<Error | null>(null)
  const isFallback = ref(false)
  const apiBase = useRuntimeConfig().public.apiBase || '/api'

  async function fetchConfig() {
    if (cache[groupKey]) {
      config.value = cache[groupKey]
      loading.value = false
      return
    }
    loading.value = true
    error.value = null
    try {
      // SSR: useRequestFetch 绕过 Vue Router → Nitro devProxy → Express
      const fetcher = import.meta.server ? useRequestFetch() : $fetch
      const res = await fetcher<{ code: number; data?: Record<string, unknown>; msg?: string }>(`${apiBase}/config/${groupKey}`, { credentials: 'include' })
      if (res.code === 200) {
        cache[groupKey] = res.data || {}
        config.value = cache[groupKey]
        isFallback.value = false
        return
      }
      throw new Error(res.msg || '配置加载失败')
    } catch (e: unknown) {
      const err = e as { message?: string };
      if (import.meta.dev) console.warn(`[useSiteConfig] ${groupKey} 加载失败, 使用降级文案`, err.message)
      config.value = FALLBACKS[groupKey] || {}
      isFallback.value = true
      error.value = e
    } finally {
      loading.value = false
    }
  }

  // -----------------------------------------------------------------------
  // SSE 监听配置版本 → 静默刷新（共享连接池）
  // -----------------------------------------------------------------------

  function startSSE() {
    if (import.meta.server) return;
    const listener = () => {
      delete cache[groupKey];
      fetchConfig();
    };
    sseListeners.set(groupKey, listener);
    ensureSSE();
  }

  function stopSSE() {
    sseListeners.delete(groupKey);
    teardownSSE();
  }

  // -----------------------------------------------------------------------
  // 初始化
  // -----------------------------------------------------------------------
  if (import.meta.client) {
    onMounted(() => {
      fetchConfig()
      startSSE()
    })
    onUnmounted(() => stopSSE())
  }

  return {
    config,
    loading,
    error,
    isFallback,
    refresh: fetchConfig,
  }
}
