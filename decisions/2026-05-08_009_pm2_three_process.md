# Decision 009 — PM2 三进程架构

- **When**: 2026-05-08 22:51 CST
- **What**: PM2 三进程守护: server(2实例) + worker(1) + client(2实例), 双环境配置
- **Why**:
  - server×2: 负载均衡 + 零停机部署
  - worker: 独立进程处理视频渲染/平台分发等长时任务
  - client×2: Nuxt SSR 两实例应对并发
- **Context**:
  - 需区分开发 (.env.development) 和生产 (.env.production) 配置
  - 后续补充了一键部署脚本 deploy.sh
- **Related commits**: `c4d828f`, `2eb0353`
- **Related files**: `pm2.config.js`, `server/.env.production`, `deploy.sh`
