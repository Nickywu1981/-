# Decision 001 — 项目技术栈定型

- **When**: 2026-05-08 16:03 CST
- **What**: 选定 Nuxt3 + Express + MySQL + Redis 电商 AI SaaS 技术栈
- **Why**: 
  - Nuxt3: SSR/SSG 双模, 自动路由, 对 SEO 友好
  - Express: 轻量 HTTP 层, 生态成熟
  - MySQL: 事务型业务数据 (订单/会员/权限)
  - Redis: 缓存/限流/Session
- **Context**: 
  - 项目代号 Movio AI, v4.1 初始提交
  - 三阶段规划: MVP→增强→扩展
  - 前端 client/ + 后端 server/ 分离
- **Related commits**: `b977177` (初始提交)
- **Related files**: `server/src/app.js`, `client/nuxt.config.ts`
