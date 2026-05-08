# Decision 003 — ESLint 零警告 + 多租户隔离

- **When**: 2026-05-08 16:55 CST
- **What**: 强制执行 ESLint 零警告策略 + 引入 tenantPool 多租户隔离
- **Why**:
  - 63+ ESLint no-unused-vars 需清零才能保证代码质量
  - tenantPool: 每个租户独立 DB 连接池, 防止数据泄漏
- **Context**:
  - 25 个 DAO 从 pool 切换到 tenantPool
  - 经历多轮修复: 第一次格式化, 第二次消除 75 个警告, 第三次全部清零
- **Related commits**: `6f15576`, `2874383`, `29dbbd5`
- **Related files**: `server/src/dao/*.js`, `server/src/db/index.js`
