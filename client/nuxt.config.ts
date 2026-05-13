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
          children: '(function(){var t=localStorage.getItem("app-theme");if(t==="dark"||t==="system"&&window.matchMedia("(prefers-color-scheme:dark)").matches||(!t&&window.matchMedia("(prefers-color-scheme:dark)").matches)){document.documentElement.classList.add("dark");document.documentElement.setAttribute("data-theme","dark")}})()',
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
    // 自动生成多尺寸图标
    pwaAssets: {
      image: 'public/favicon.svg',
      preset: 'minimal-2023',
    },
    manifest: {
      name: 'Movio AI — 电商AI视觉创作平台',
      short_name: 'Movio AI',
      description: '电商图片+视频AI一体化创作平台，抠图/场景/主图/视频/详情页/虚拟模特',
      theme_color: '#5b5fe3',
      background_color: '#ffffff',
      display: 'standalone',
      display_override: ['standalone', 'minimal-ui'],
      start_url: '/',
      scope: '/',
      orientation: 'any',
      icons: [
        { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
      ],
      categories: ['productivity', 'utilities', 'business'],
      lang: 'zh-CN',
      dir: 'ltr',
      prefer_related_applications: false,
      shortcuts: [
        { name: '创作中心', short_name: '创作', url: '/workspace', description: '进入创作工作台' },
        { name: '图片工具', short_name: '图片', url: '/work/image', description: 'AI图片生成' },
        { name: '视频工具', short_name: '视频', url: '/work/video', description: 'AI视频生成' },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2,jpg,webp,avif}'],
      // 导航请求离线回退
      navigateFallback: '/offline.html',
      navigateFallbackDenylist: [/^\/api\//, /^\/_nuxt\//],
      // 注入自定义 SW 代码
      sourcemap: false,
      runtimeCaching: [
        // API GET — 网络优先 + 长期缓存 + 后台更新
        {
          urlPattern: '/api/**',
          handler: 'NetworkFirst',
          method: 'GET',
          options: {
            cacheName: 'api-cache',
            networkTimeoutSeconds: 10,
            expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            backgroundSync: {
              name: 'movio-api-queue',
              options: { maxRetentionTime: 60 * 60 * 24 },
            },
          },
        },
        // 静态资源 — 缓存优先
        {
          urlPattern: /\.(?:js|css|woff2?|png|jpg|webp|avif|svg|ico)$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'static-assets',
            expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 7 },
          },
        },
        // 图片生成结果 — 后台更新
        {
          urlPattern: /\/api\/.*(?:image|generate|result).*/i,
          handler: 'StaleWhileRevalidate',
          method: 'GET',
          options: {
            cacheName: 'generated-results',
            expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 2 },
          },
        },
        // 字体 — 缓存优先长过期
        {
          urlPattern: /\.(?:woff2?|ttf|eot|otf)$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'fonts',
            expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
          },
        },
      ],
    },
    client: {
      installPrompt: true,
    },
    // 推送通知 VAPID 密钥（从环境变量读取，Phase 2 实现服务端）
    // webPush: {
    //   enabled: !!process.env.VAPID_PUBLIC_KEY,
    // },
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

