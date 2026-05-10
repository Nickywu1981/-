# Migration Log

## 当前迁移系统

项目存在两条迁移轨道，当前主轨为 `server/sql/migration_XXX_name.sql`，旧轨为 `server/sql/migrations/*.sql`。新迁移一律加入主轨，按序号递增。

---

## 主轨: `server/sql/migration_*.sql`

| 序号 | 文件名 | 功能 | 状态 |
|------|--------|------|------|
| 001 | migration_001_platform_spec.sql | 13 电商平台图片/视频尺寸规范 | ✅ |
| 002 | migration_002_diy_enhance.sql | DIY 页面双端配置 + 状态机 + 自动版本 + Redis缓存 | ✅ |
| 003 | migration_003_form_enhance.sql | 自定义表单系统（校验/联动/脱敏/双端），含 diy_custom_module/action 表（已废弃，无应用代码） | ✅ |
| 004 | migration_004_proxy_enhance.sql | API 代理系统增强（白名单/加密凭证/限流熔断） | ✅ |
| 005 | migration_005_ai_model_config.sql | AI 模型可视化配置（7厂商注册/限流/敏感词/用量） | ✅ |
| 006 | migration_006_prompt_enhance.sql | 提示词系统增强（使用历史/推荐缓存/模板评分） | ✅ |
| 007 | migration_007_audit_log.sql | 操作审计日志表（发布/下线/删除记录） | ✅ |
| 007 | migration_007_publish_record.sql | 多平台内容分发记录 | ✅ |
| 007 | migration_007_video_translate.sql | 视频翻译全链路 | ✅ |
| 008 | migration_008_copy_history.sql | 文案生成历史表 | ✅ |
| 008 | migration_008_distribution_advance.sql | 分销进阶（等级/团队/素材/提现/裂变） | ✅ |
| 009 | migration_009_copywriting.sql | 文案生成历史表（重复编号） | ✅ |
| 009 | migration_009_digital_push_marketplace.sql | 数字人带货 + 平台直推 + 场景模板市场 | ✅ |
| 010 | migration_010_diy_templates.sql | DIY 模板库表 + 20 个行业模板种子数据 | ✅ |
| 010 | migration_010_hotfix_diy_columns.sql | 对齐 diy_page / diy_page_version 表与 DAO 字段 | ✅ |
| 011 | migration_011_p2_column_fixes.sql | ai_call_log 列修复 + job_queue 表 | ✅ |
| 012 | migration_012_video_translate.sql | 视频翻译任务表 | ✅ |
| 013 | migration_013_distribution.sql | 分销系统表 | ✅ |
| 014 | migration_014_site_config.sql | site_config 表 + 默认工作台配置 | ✅ |
| 015 | migration_015_fix_config_type.sql | site_config 补全 config_type 列 | ✅ |
| 016 | migration_016_unify_diy_schema.sql | DIY Schema 统一（FK + 索引 + 组件种子） | ✅ |

> **已知问题**: 编号 007/008/009/010 各有重复，功能独立互不影响。编号冲突仅因历史分支并行开发。新迁移请从 017 开始递增。

>

---

## 旧轨: `server/sql/migrations/*.sql`

| 文件 | 功能 |
|------|------|
| 20250101000001_initial_schema.sql | 核心表初始化 v2.0 |
| 20250101000002_b8_b14_tables.sql | B8-B14 模块扩展表 |
| 20250101000003_seed_data.sql | 预设数据（短信模板/平台尺寸/会员套餐） |
| 20250507000001_allinpay_integration.sql | 通联支付聚合收银台 |
| 20260508000001_ai_models_dispatch.sql | 多模型统一调度 |
| 20260508000001_missing_tables_fix.sql | 缺失表补充（6 个 schema 缺失项） |
| 20260509000001_schema_alignment.sql | Schema 对齐（13 张缺失表 + DAO 修复） |
| m001_core.sql | 核心模块表（G6, 2026-05-08） |
| m002_business.sql | 业务模块表（G6, 2026-05-08） |
| m003_membership.sql | 会员系统表（G6, 2026-05-08） |
| m005_seed.sql | 种子数据（G6, 2026-05-08） |

> 旧轨文件可能已在生产环境执行。新迁移请使用主轨，勿修改旧轨文件除非有明确兼容需求。

---

## 迁移规范

1. **命名**: `migration_NNN_descriptive_name.sql`，NNN 三零补齐递增
2. **幂等**: 所有 DDL 使用 `IF NOT EXISTS`，所有 DML 使用条件判断
3. **注释**: 文件头注明功能、依赖、影响范围
4. **回滚**: 复杂迁移附回滚脚本注释
