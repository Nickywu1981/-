/**
 * 前端行为埋点 composable
 * 自动追踪页面浏览和工具使用
 *
 * 使用:
 *   const { track } = useAnalytics();
 *   track('tool_use', { tool: 'remove-bg' });
 *   track('share', { tool: 'remove-bg', channel: 'link' });
 */
export function useAnalytics() {
  const route = useRoute();

  async function track(event: string, metadata: Record<string, any> = {}) {
    try {
      await $fetch('/api/analytics/track', {
        method: 'POST',
        body: { event, metadata },
      });
    } catch {
      // 埋点失败静默忽略
    }
  }

  // 页面浏览自动上报（去重：同路径5秒内不重复报）
  const lastPageTrack = new Map<string, number>();
  function trackPageView() {
    const path = route.path;
    const now = Date.now();
    const last = lastPageTrack.get(path) || 0;
    if (now - last < 5000) return;
    lastPageTrack.set(path, now);
    track('page_view', { path, title: document.title });
  }

  // 工具使用快捷方法
  function trackToolUse(toolId: string) {
    track('tool_use', { targetType: toolId, targetId: toolId });
  }

  return { track, trackPageView, trackToolUse };
}

export default useAnalytics;
