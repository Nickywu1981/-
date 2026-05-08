# Decision 012 — 认证体系简化

- **When**: 2026-05-08 23:28 CST
- **What**: 认证服务大精简: 砍掉字段加密/邀请码/分销逻辑, 统一为 username 登录
- **Why**:
  - 原始 auth.service.js 214 行, 包含加密/邀请码/分销三大非核心模块
  - MVP 阶段不需要: 邀请码和分销是增长阶段才用
  - 简化后 150 行, 单一认证流程, 易审计
- **Context**:
  - bcrypt→bcryptjs 替换 (消除 node-gyp 编译依赖)
  - Cookie 鉴权 + CSRF token 保护
- **Related commits**: `beebcd5`, `decfbe4`
- **Related files**: `server/src/services/auth.service.js`
