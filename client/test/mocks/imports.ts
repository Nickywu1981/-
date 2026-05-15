// Mock #imports for vitest (Nuxt auto-imports)
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
export { ref, computed, watch, onMounted, onUnmounted };
export const useFetch = () => Promise.resolve({ data: null, error: null });
export const useI18n = () => ({ t: (key: string) => key, locale: { value: 'zh-CN' } });
export const $fetch = () => Promise.resolve({ code: 200, msg: 'ok', data: {} });
