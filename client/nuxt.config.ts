export default defineNuxtConfig({
  devtools: { enabled: process.env.NODE_ENV !== 'production' },

  css: ['@/assets/css/unified-design-system.css', '@/assets/css/design-tokens.css', '@/assets/css/animations.css', '@/assets/css/responsive.css'],

  app: {
    // Smooth page transitions for workspace navigation
    pageTransition: {
      name: 'page',
      mode: 'out-in',
      appear: true,
    },
    layoutTransition: {
      name: 'layout',
      mode: 'out-in',
      appear: false,
    },
    head: {
      title: 'Movio AI — AI电商视觉创作平台',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'description', content: 'Movio AI — 电商AI SaaS，抠图/场景/主图/视频/详情页/虚拟模特，一个工具搞定电商全部图文视频素材' },
        { name: 'theme-color', content: '#5b5fe3' },
        { 'http-equiv': 'X-UA-Compatible', content: 'IE=edge' },
        // Content Security Policy (CSP)
        { 'http-equiv': 'Content-Security-Policy', content: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' wss: ws:${process.env.NODE_ENV !== 'production' ? ' http://localhost:3001 http://localhost:3000' : ''}; worker-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'` },
        // XSS 防护
        { 'http-equiv': 'X-XSS-Protection', content: '1; mode=block' },
        // 仅允许同源框架
        { 'http-equiv': 'X-Frame-Options', content: 'SAMEORIGIN' },
        // 禁止 MIME 嗅探
        { 'http-equiv': 'X-Content-Type-Options', content: 'nosniff' },
        // Referrer 策略
        { name: 'referrer', content: 'strict-origin-when-cross-origin' },
        // Apple 移动端 Web App
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-title', content: 'Movio AI' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'manifest', href: '/manifest.json' },
        // 预连接外部 CDN / API
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'dns-prefetch', href: '//cdn.jsdelivr.net' },
      ],
      script: [
        // 内联暗黑模式防闪烁脚本
        {
          children: '(function(){var t=localStorage.getItem("app-theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme:dark)").matches)){document.documentElement.setAttribute("data-theme","dark")}})()',
          type: 'text/javascript',
        },
      ],
    },
  },

  // 实验性功能
  experimental: {
    crossOriginPrefetch: true,
  },

  typescript: {
    strict: true,
    typeCheck: false, // 开发阶段关闭，避免 vue-tsc 阻塞
  },

  modules: ['@nuxtjs/i18n', '@vite-pwa/nuxt'],

  // i18n 多语言配置
  i18n: {
    vueI18n: './i18n.config.ts',
    locales: [
      { code: 'zh', file: 'zh.json' },
      { code: 'en', file: 'en.json' },
    ],
    defaultLocale: 'zh',
    strategy: 'prefix_except_default',
    langDir: 'i18n/locales',
    // 浏览器语言自动检测 + IP 回退
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'movio_lang',
      cookieCrossOrigin: false,
      cookieSecure: false,
      redirectOn: 'root',
      alwaysRedirect: false,
      fallbackLocale: 'zh',
    },
    // 根据 Accept-Language + Cookie 自动匹配
  },

  // PWA 渐进式应用配置
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Movio AI — 电商AI视觉创作平台',
      short_name: 'Movio AI',
      description: '电商图片+视频AI一体化创作平台，抠图/场景/主图/视频/详情页/虚拟模特',
      theme_color: '#7C3AED',
      background_color: '#ffffff',
      display: 'standalone',
      start_url: '/',
      icons: [
        { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
      ],
      categories: ['productivity', 'utilities'],
      lang: 'zh-CN',
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
      runtimeCaching: [
        {
          urlPattern: '/api/**',
          handler: 'NetworkFirst',
          method: 'GET',
          options: {
            cacheName: 'api-cache',
            expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
          },
        },
      ],
    },
    client: {
      installPrompt: true,
    },
  },

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001/api'),
      appName: process.env.NUXT_PUBLIC_APP_NAME || 'Movio AI',
      appUrl: process.env.NUXT_PUBLIC_APP_URL || (process.env.APP_URL || 'https://movio.ai'),
      env: process.env.NUXT_PUBLIC_ENV || 'development',
    },
  },

  nitro: {
    devProxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
    // 生产构建优化
    compressPublicAssets: true,
    minify: true,
    // 静态资源缓存头
    routeRules: {
      '/_nuxt/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
      '/favicon.svg': { headers: { 'cache-control': 'public, max-age=604800' } },
      '/manifest.json': { headers: { 'cache-control': 'public, max-age=86400' } },
      '/auth/login': { redirect: '/login' },
    },
  },

  vite: {
    server: {
      fs: {
        strict: true,
      },
    },
    css: {
      preprocessorOptions: {
        scss: { additionalData: '' },
      },
    },
    resolve: {
      alias: {
        '@shared': '../shared',
      },
    },
    build: {
      // 大依赖拆分，避免单一超大 chunk
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('element-plus')) return 'element-plus'
            if (id.includes('vue') || id.includes('pinia')) return 'vue-core'
          },
        },
      },
    },
});

