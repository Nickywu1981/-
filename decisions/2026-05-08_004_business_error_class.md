# Decision 004 — BusinessError 语义化异常类

- **When**: 2026-05-08 19:46 CST
- **What**: 引入 BusinessError 类替代 `throw 'string'`, 消除 76 个 no-throw-literal ESLint 错误; 同时完成 CJS→ESM 迁移
- **Why**:
  - 裸字符串 throw 无调用栈追踪, 排查困难
  - BusinessError 带 errorCode + 结构化 message, 前端可解析
  - `module.exports` → `export default` 统一模块规范
- **Context**:
  - 影响范围: 76 处 throw literal 全部替换
  - 同 commit 修复了 `import * asfrom` 缺失空格的 4 个文件
- **Related commits**: `3f2282c`
- **Related files**: `server/src/utils/BusinessError.js`
