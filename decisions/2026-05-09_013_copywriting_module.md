# Decision 013 — 电商文案生成模块

- **When**: 2026-05-09 00:03 CST
- **What**: 电商文案生成: 标题/卖点/跨境翻译, 9 语种 × 9 平台规则
- **Why**:
  - 电商文案是最大痛点: 卖家需为每个平台写不同风格
  - 9 语种: 中英日韩西法德葡阿
  - 9 平台: 淘宝/天猫/京东/拼多多/抖音/Amazon/Lazada/Shopee/Wish
- **Context**:
  - platformSpecService.adaptImage() — sharp 自动 resize+format
  - migration_008: copy_history 表支持历史追踪
  - 前端三 Tab: 标题/文案/翻译 + 历史记录
- **Related commits**: `44c97cd`, `e0fe11c`, `f1b5734`, `f0aeb1a`
- **Related files**: `server/src/services/copywritingService.js`, `server/sql/migration_008_copy_history.sql`
