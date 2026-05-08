# Decision 015 — Zod 校验全覆盖

- **When**: 2026-05-09 00:21~00:24 CST
- **What**: Zod schema 校验覆盖 56/57 路由 (仅 allinpayRoutes 支付回调有意豁免)
- **Why**:
  - 输入校验是安全第一道防线: SQL 注入/XSS/参数类型错误
  - Zod 同时提供 TypeScript 类型推断, 双重价值
  - v4_assets 等路由之前没有任何校验, 直接暴露查询参数
- **Context**:
  - validate() 中间件自动将解析结果写回 req.query
  - 豁免规则: 第三方支付回调格式不受我方控制
- **Related commits**: `0250812`, `d5128bc`
- **Related files**: `server/src/utils/validate.js`
