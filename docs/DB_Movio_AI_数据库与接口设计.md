# Movio AI — 数据库与接口设计文档

> **编写组**：G6 数据库接口组（Backend-B 🔴主 / DevOps 🟡辅 / QA-Engineer 🟡辅）
> **审核组**：G1 架构规划组（Architect）
> **版本**：v1.0 | **日期**：2026-05-08

---

## 一、数据库总览

### 1.1 当前库表现状

- **数据库**：MySQL 8.4
- **当前表数**：33 张（schema.sql 全量）
- **引擎**：InnoDB（全部）
- **字符集**：utf8mb4

### 1.2 表分类

| 类别 | 表数 | 表名 |
|------|:--:|------|
| 用户与认证 | 5 | `users`, `verification_codes`, `refresh_tokens`, `user_credits`, `user_checkins` |
| 会员与支付 | 4 | `plans`, `subscriptions`, `orders`, `recharge_logs` |
| AI 任务 | 4 | `ai_tasks`, `batch_tasks`, `task_results`, `ai_logs` |
| 素材与存储 | 4 | `user_files`, `file_conversions`, `collections`, `collection_items` |
| 电商业务 | 5 | `products`, `badges`, `platform_details`, `size_templates`, `brand_settings` |
| 内容与合规 | 4 | `sensitive_words`, `compliance_rules`, `script_templates`, `hashtags` |
| 营销与风控 | 3 | `coupons`, `abuse_records`, `diy_pages` |
| 系统配置 | 4 | `site_settings`, `email_templates`, `schedules`, `migrations` |

---

## 二、核心表结构规范

### 2.1 必选字段（所有业务表）

```sql
-- 每张业务表必须包含
id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
tenant_id   INT UNSIGNED NOT NULL,          -- 多租户隔离（G6 自动注入）
created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
deleted_at  TIMESTAMP NULL DEFAULT NULL,     -- 软删除

INDEX idx_tenant (tenant_id),
INDEX idx_deleted (deleted_at)
```

### 2.2 命名规范

| 项目 | 规范 | 示例 |
|------|------|------|
| 表名 | 小写蛇形、复数 | `user_credits` |
| 主键 | `id` | `id INT UNSIGNED AUTO_INCREMENT` |
| 外键 | `{表单数}_id` | `user_id`, `plan_id` |
| 布尔 | `is_{描述}` | `is_active`, `is_verified` |
| 枚举 | `{name}_type` | `task_type`, `plan_type` |
| JSON | `{name}_data` | `extra_data`, `result_data` |
| 索引 | `idx_{列名}` | `idx_user_status` |
| 唯一 | `uq_{列名}` | `uq_email_tenant` |

---

## 三、API 接口全量清单

### 3.1 接口总览

| 模块 | 路由前缀 | 端点数 | 认证 | 已有 |
|------|------|:--:|:--:|:--:|
| 用户认证 | `/api/user` | 8 | 混合 | ✅ |
| 图片处理 | `/api/image` | 7 | JWT | ✅ |
| 视频处理 | `/api/video` | 5 | JWT | ✅ |
| 高级图片 | `/api/advanced-image` | 6 | JWT | ✅ |
| 高级视频 | `/api/advanced-video` | 6 | JWT | ✅ |
| 批量处理 | `/api/batch` | 5 | JWT | ✅ |
| 会员支付 | `/api/payment` | 6 | JWT | ✅ |
| 文件上传 | `/api/upload` | 3 | JWT | ✅ |
| 营销角标 | `/api/badges` | 4 | JWT | ✅ |
| 平台详情 | `/api/platform-detail` | 4 | JWT | ✅ |
| 尺寸模板 | `/api/size-template` | 4 | JWT | ✅ |
| 合规检查 | `/api/compliance` | 3 | JWT | ✅ |
| 多语言脚本 | `/api/multilingual` | 3 | JWT | ✅ |
| 会员分级 | `/api/tier` | 4 | JWT | ✅ |
| 防刷风控 | `/api/abuse` | 3 | JWT | ✅ |
| 帮助反馈 | `/api/help` | 3 | 混合 | ✅ |
| 管理后台 | `/api/admin` | 8 | Admin | ✅ |
| 健康检查 | `/api/health` | 1 | 无 | ✅ |
| WebSocket | `/ws` | 1 | JWT | ✅ |
| **合计** | — | **84** | — | — |

### 3.2 接口标准格式

**请求**：
```
POST /api/user/login
Content-Type: application/json
Authorization: Bearer {token}   (如需)

Body: { "account": "demo", "password": "demo123" }
```

**响应**：
```json
{
  "code": 0,
  "message": "登录成功",
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "user": { "id": 1, "nickname": "电商达人小王", "role": "user" }
  }
}
```

**错误码规范**：
```
EC_AUTH_001  认证失败
EC_PARAM_001 参数校验失败
EC_TENANT_001 租户隔离违规
EC_RATE_001  请求频率超限
EC_TASK_001  任务处理失败
EC_PAY_001   支付失败
```

---

## 四、多租户隔离方案

### 4.1 tenant_id 自动注入

```javascript
// DAO 基类 —— 所有 SQL 自动追加 tenant_id
class BaseDAO {
  buildWhere(sql, conditions, tenantId) {
    if (tenantId) conditions.tenant_id = tenantId;
    return { sql, conditions };
  }

  async query(sql, params, req) {
    const tenantId = req?.user?.tenantId;
    if (tenantId) params.push(tenantId);
    return pool.execute(sql, params);
  }
}
```

### 4.2 隔离规则

| 级别 | 说明 |
|:--:|------|
| **强隔离** | 所有查询必须有 `tenant_id` 条件 |
| **软隔离** | 系统配置类（`site_settings`）允许跨租户只读 |
| **admin 穿透** | 管理员可以通过 `?tenant=all` 查看所有租户数据 |

---

## 五、Redis 缓存策略

| 缓存项 | Key 格式 | TTL | 用途 |
|------|------|-----|------|
| 套餐列表 | `plans:all` | 10min | 支付页 |
| 营销标签 | `badges:tenant:{id}` | 5min | 工作台 |
| 平台模板 | `platform:templates:{platform}` | 30min | 详情页 |
| 用户会话 | `user:session:{userId}` | 24h | 在线状态 |
| 请求限流 | `rate:{userId}:{endpoint}` | 60s | 防刷 |

---

## 六、待优化项

| 优先级 | 项 | 说明 |
|:--:|------|------|
| 🔴 | 读/写分离 | 高并发下主从复制 |
| 🟠 | 慢查询索引 | `ai_tasks` 按 `status+created_at` 复合索引 |
| 🟡 | 历史数据归档 | `ai_logs` 超 30 天数据移入归档表 |
