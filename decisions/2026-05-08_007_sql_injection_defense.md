# Decision 007 — SQL 注入防御 + 文件安全检查

- **When**: 2026-05-08 20:26~20:32 CST
- **What**: 两线安全加固:
  1. SQL 注入: LIMIT/OFFSET 参数化, 杜绝字符串拼接
  2. 文件安全: 魔数检测 (magicDetector) 防伪造扩展名
- **Why**:
  - 已有分页用字符串拼接 `LIMIT ${req.query.pageSize}`, 属高危漏洞
  - 文件上传仅靠扩展名判断不可行, 需读二进制头检测真实格式
- **Context**: P1 优先级, 同批次还修复了 Controller try-catch 统一
- **Related commits**: `971eeb5`, `9c25e3c`, `baafd57`
- **Related files**: `server/src/utils/magicDetector.js`, `server/src/dao/*.js`
