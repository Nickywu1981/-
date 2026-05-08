# Decision Archive — INDEX

本项目全部重大决策的按时间线索引。每条记录包含 What / When / Why / Context。

---

## 2026-05-08 (周六) — 项目奠基日

| ID | 时间 | 决策 | 影响等级 |
|----|------|------|----------|
| [001](./2026-05-08_001_project_inception.md) | 16:03 | 技术栈定型: Nuxt3+Express+MySQL+Redis | 🏗️ 架构级 |
| [002](./2026-05-08_002_test_strategy.md) | 16:25 | 测试策略: vitest + 契约测试 + 22文件158用例 | 🔒 质量级 |
| [003](./2026-05-08_003_eslint_quality_gates.md) | 16:55 | ESLint 零警告 + tenantPool 多租户隔离 | 🛡️ 安全级 |
| [004](./2026-05-08_004_business_error_class.md) | 19:46 | BusinessError 语义化异常类消除 76 个 ESLint 错误 | 🧱 工程级 |
| [005](./2026-05-08_005_three_layer_arch.md) | 20:12 | 路由→控制器→服务三层解耦标准化 | 🏗️ 架构级 |
| [006](./2026-05-08_006_killer_features.md) | 20:24 | 剪映/CapCut 生态对接 + 多平台分发 13 平台 | 🚀 战略级 |
| [007](./2026-05-08_007_sql_injection_defense.md) | 20:27 | SQL 注入参数化防御 + 文件魔数检测 | 🛡️ 安全级 |
| [008](./2026-05-08_008_one_click_db_init.md) | 22:45 | 一键数据库初始化 — 建库+迁移+种子 | 🔧 运维级 |
| [009](./2026-05-08_009_pm2_three_process.md) | 22:51 | PM2 三进程守护架构 (server×2+worker+client×2) | 🔧 运维级 |
| [010](./2026-05-08_010_memory_system.md) | 23:06 | 记忆自动同步系统 — health/sync 双引擎 | 🧠 自治级 |
| [011](./2026-05-08_011_multi_model_ai.md) | 23:16 | 多模型 AI 架构 — 4 适配器/3 调度模式 | 🧠 战略级 |
| [012](./2026-05-08_012_auth_simplification.md) | 23:28 | 认证简化 — 砍掉加密/邀请/分销, 统一 username | 🔒 产品级 |

## 2026-05-09 (周日) — 功能完善日

| ID | 时间 | 决策 | 影响等级 |
|----|------|------|----------|
| [013](./2026-05-09_013_copywriting_module.md) | 00:03 | 电商文案生成 — 9语种×9平台 | 🚀 战略级 |
| [014](./2026-05-09_014_diy_template_library.md) | 00:07 | DIY 模板库 — 20 行业种子数据 | 🚀 产品级 |
| [015](./2026-05-09_015_zod_validation_coverage.md) | 00:21 | Zod 校验覆盖 56/57 路由 | 🛡️ 质量级 |
| [016](./2026-05-09_016_testing_expansion.md) | 00:50 | 测试扩展 — 服务/DAO 层全覆盖 | 🔒 质量级 |
| [017](./2026-05-09_017_semantic_search_upgrade.md) | 01:41 | 语义搜索 v2 — 中文分词 + 知识图谱混合 | 🧠 技术级 |
| [018](./2026-05-09_018_compliance_module.md) | 00:52 | 合规检查模块 — content moderation + platform rules | 🛡️ 合规级 |
| [019](./2026-05-09_019_embedding_support.md) | 02:25 | OpenAI 适配器新增 Embedding + 语义搜索升级 | 🧠 技术级 |
| [020](./2026-05-09_020_deployment_ready.md) | 01:41 | 生产就绪 — 一键部署脚本 + PM2 集群 + Schema 对齐 | 🚀 里程碑级 |
