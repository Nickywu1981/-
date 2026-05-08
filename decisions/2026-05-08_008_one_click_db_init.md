# Decision 008 — 一键数据库初始化

- **When**: 2026-05-08 22:45 CST
- **What**: 创建一键脚本: `npm run db:init` → 建库+迁移+种子+管理员, 三命令到位
- **Why**:
  - 新手 onboarding: 无需手动执行 10+ 条 SQL
  - 生产部署: 新环境启动前自动完成数据库准备
  - CI/CD: 可集成到自动化流水线
- **Context**:
  - 后续补充了 migration_008~010 (文案历史/DIY模板/Schema对齐)
  - 当前 34 张表, 全部自动化管理
- **Related commits**: `be82c2b`
- **Related files**: `server/scripts/db-init.js`, `server/sql/migrations/`
