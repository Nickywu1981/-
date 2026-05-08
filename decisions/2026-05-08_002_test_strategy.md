# Decision 002 — 测试策略

- **When**: 2026-05-08 16:25 CST
- **What**: 测试框架选 vitest, 修复全部 22 个测试文件 (158 用例全通过)
- **Why**:
  - vitest: 与 Vite 零配置集成, 热模块替换测试
  - 158 用例覆盖: 路由/控制器/服务/工具函数
- **Context**: 
  - 后续扩展至契约测试 (a96f3e7)
  - 后续达 29 个测试文件
- **Related commits**: `032cb48`
- **Related files**: `server/vitest.config.js`, `server/src/__tests__/`
