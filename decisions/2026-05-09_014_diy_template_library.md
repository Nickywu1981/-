# Decision 014 — DIY 模板库

- **When**: 2026-05-09 00:07 CST
- **What**: DIY 模板库: migration_010 + 20 行业种子数据 + 全栈 CRUD
- **Why**:
  - 降低用户创作门槛: 100+ 行业模板, 选模板→改内容→发布
  - 20 行业覆盖: 电商/教育/餐饮/旅游/房地产/医疗等
  - 路由注册顺序修复: 模板库路由放到 /:id 之前避免误匹配
- **Context**:
  - 模板库方法: listTemplates/getTemplateById/use/industries
  - 5 层全栈: migration→DAO→Service→Controller→Routes
- **Related commits**: `b9de292`, `9ac2540`, `02d4ed3`, `47ab75e`, `df2a1fa`, `13fe0ed`
- **Related files**: `server/sql/migration_010_diy_templates.sql`, `server/src/dao/diyDao.js`
