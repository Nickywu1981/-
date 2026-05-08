# Decision 010 — 记忆自动同步系统

- **When**: 2026-05-08 23:06 CST
- **What**: 创建双引擎记忆系统:
  - memory-health.js: 诊断脚本, 14项检查, S/A/B/C 评级
  - memory-sync.js: 自修复脚本, 检测偏离→自动同步
- **Why**:
  - 代码库快速增长 (首日 94 commits), 手动追踪路由/DAO/SQL 不现实
  - AI 辅助开发需要在上下文窗口精确引用文件路径
  - 记忆漂移是最大敌人: 需要自动检测+自动修复
- **Context**:
  - 当前 141 页面, 58 路由, 42 控制器, 82 服务, 38 DAO, 34 表 — 0% 漂移
  - Hook 链集成: 4 个 PostToolUse hook 触发自动同步
- **Related commits**: `34f5017`, `41e5717`
- **Related files**: `server/scripts/memory-sync.js`, `server/scripts/memory-health.js`, `.claude/settings.local.json`
