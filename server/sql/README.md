# SQL 迁移文件说明

## 当前活跃轨道

### 主轨（新环境初始化用）
| 文件 | 说明 |
|------|------|
| `migrations/m001_core.sql` | 核心表（用户/租户/配置/DIY/AI模型） |
| `migrations/m002_business.sql` | 业务表（订单/积分/分销/平台/素材） |
| `migrations/m003_membership.sql` | 会员表 |
| `migrations/m005_seed.sql` | 种子数据 |

### 增量迁移（按功能）
`sql/migration_001` ~ `sql/migration_017` — 每次功能变更的增量 DDL，`IF NOT EXISTS` 安全。

### 种子数据
`sql/seed_*.sql` + `sql/preset_data.sql` — 开发/测试环境预置数据。

## 已废弃轨道

以下文件被 m00* 系列完全覆盖，仅保留归档：

- `migrations/20250101000001_initial_schema.sql` → `m001_core.sql`
- `migrations/20250101000002_b8_b14_tables.sql` → `m002_business.sql`
- `migrations/20250101000003_seed_data.sql` → `m005_seed.sql`
- `migrations/20260508000001_ai_models_dispatch.sql` → 已合并至 `m001_core.sql`
- `migrations/20260508000001_missing_tables_fix.sql` → 已合并至 `m002_business.sql`
- `migrations/20260509000001_schema_alignment.sql` → 对齐脚本，仅需执行一次

**新环境只需执行**: `m001 → m002 → m003 → m005 → migration_001..017`（按顺序，全部 `IF NOT EXISTS` 安全）
