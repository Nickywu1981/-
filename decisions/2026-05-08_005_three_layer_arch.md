# Decision 005 — 三层解耦架构标准

- **When**: 2026-05-08 20:12~20:13 CST
- **What**: 强制执行 路由 → 控制器 → 服务 三层解耦架构
  - 路由层: 只做路由注册 + Zod 校验 + 限流中间件
  - 控制器层: 参数提取 + 响应格式化, 不写业务逻辑
  - 服务层: 纯业务逻辑 + DAO 调用
- **Why**:
  - 之前有路由直接在 handler 里写 DB 查询 (v4_assets.routes.js)
  - 利于单元测试: 服务可独立 mock DAO, 路由可独立 mock 服务
- **Context**:
  - Open API 路由率先示范: 路由→openApiController→openApiService
  - catch 块也标准化: 不再裸 catch, 改为 BusinessError 链
- **Related commits**: `1ffbc90`, `907987e`
- **Related files**: `server/src/route/`, `server/src/controller/`, `server/src/services/`
