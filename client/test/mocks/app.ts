// Mock #app for vitest (Nuxt internal module)
export const useRuntimeConfig = () => ({
  public: {
    apiBase: 'http://localhost:3001/api',
  },
});

export const navigateTo = () => Promise.resolve();
export const useRouter = () => ({
  push: () => Promise.resolve(),
  replace: () => Promise.resolve(),
});
export const useRoute = () => ({
  path: '/',
  query: {},
  params: {},
});
export const useNuxtApp = () => ({});
