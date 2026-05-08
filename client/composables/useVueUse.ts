import { useDebounceFn, useThrottleFn, useTitle, useIntervalFn, useEventListener } from '@vueuse/core';

export function useDebounce<T extends (...args: any[]) => any>(fn: T, ms = 300) {
  return useDebounceFn(fn, ms);
}

export function useThrottle<T extends (...args: any[]) => any>(fn: T, ms = 300) {
  return useThrottleFn(fn, ms);
}

export function usePageTitle(title: string) {
  return useTitle(title, { titleTemplate: '%s | Movio AI' });
}

export function usePolling(fn: () => void, intervalMs = 10000) {
  return useIntervalFn(fn, intervalMs);
}

export function useClickOutside(target: any, handler: (e: Event) => void) {
  return useEventListener(document, 'click', (e: Event) => {
    const el = typeof target === 'function' ? target() : target;
    if (el && !el.contains(e.target as Node)) {
      handler(e);
    }
  });
}

export function useCopyToClipboard() {
  const copy = async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    }
  };
  return { copy };
}
