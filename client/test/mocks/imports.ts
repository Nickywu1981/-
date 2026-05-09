// Mock #imports for vitest (Nuxt auto-imports)
import { ref, computed, watch } from 'vue';
export { ref, computed, watch };
export const useFetch = () => Promise.resolve({ data: null, error: null });
