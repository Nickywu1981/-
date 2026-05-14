# Movio AI 后台多端架构成型方案 — 方案D（3端改良架构）落地蓝图

> 决策日期：2026-05-15 | 版本：v3.0 Final
> 参与：G1 架构规划组
> 前序：v1.0 三端架构初评 → v2.0 三方案全维度对比 → v3.0 最终落地蓝图（本文档）

---

## 一、方案D 定义（一句话）

> **端1 纯底层总后台 + 端2 纯业务运营后台 + 端3 统一用户工作台（代理/企业内嵌，顶部下拉秒切）**

与方案C（3端精简）的本质区别：端1 只放基础设施，不放任何业务功能。运营/财务在端2一站式操作。代理/企业不独立建站，内嵌到端3用户工作台，通过 `active_role` 切换界面。

---

## 二、三端职责边界（铁律）

```
┌──────────────────────────────────────────────────────────────────┐
│  端1: 平台运维总后台  admin.movio.internal (内网/VPN)             │
│  ────────────────────────────────────────────────────────────────│
│  使用者: 超管 1-3人 | 认证: JWT(admin) + MFA(TOTP)                │
│  职责:                                                           │
│    ✓ 全局系统配置 (config/site-config)                            │
│    ✓ JWT/加密密钥 轮换 (KEYS ONLY HERE)                           │
│    ✓ WAF规则 / IP黑名单 / 限流策略                                │
│    ✓ 模型供应商管理 (OpenAI/Claude/SD etc 的 key/baseUrl)         │
│    ✓ 租户开关 (企业注册/代理入驻/支付渠道 全局开关)                │
│    ✓ 安全审计日志 (audit-log 只读)                                │
│    ✓ 系统参数 (全局并发上限/文件大小/Token限制)                    │
│    ✓ DB 备份触发 + 慢查询监控                                     │
│    ✗ 不碰: 用户管理、订单、佣金、活动、审核、内容                  │
│    ✗ 不碰: 代理/企业 的业务数据                                   │
├──────────────────────────────────────────────────────────────────┤
│  端2: 业务运营后台  ops.movio.cn (公网 + IP白名单可选)            │
│  ────────────────────────────────────────────────────────────────│
│  使用者: 运营/财务/内容审核/客服 | 认证: JWT(ops) + RBAC           │
│  职责:                                                           │
│    ✓ 用户管理 (CRUD/冻结/解封/实名审核)                           │
│    ✓ 代理管理 (入驻/分佣比例/提现审核)                            │
│    ✓ 企业管理 (入驻/认证/企业审核)                                │
│    ✓ 订单/充值/退款 (查询/人工处理)                               │
│    ✓ 分账对账 (代理佣金/企业分账)                                  │
│    ✓ 活动配置 (优惠券/促销/限时活动)                              │
│    ✓ 内容审核 (AI输出/用户上传 人工复审)                           │
│    ✓ 业务网关配置 (模板市场开关/活动启用/行业参数)                  │
│    ✓ 数据看板 (运营Dashboard/财务报表)                            │
│    ✗ 不碰: WAF/IP黑名单/模型供应商Key/加密密钥                     │
│    ✗ 不碰: 系统级配置 (端口/DB连接/Redis连接)                      │
├──────────────────────────────────────────────────────────────────┤
│  端3: 统一用户工作台  work.movio.cn (公网)                        │
│  ────────────────────────────────────────────────────────────────│
│  使用者: 普通用户/代理商/企业管理员 | 认证: JWT(consumer)          │
│  职责:                                                           │
│    ✓ AI 创作工具 (图片/视频/文案/配音) — 所有角色共用              │
│    ✓ 项目管理 (我的项目/历史记录)                                  │
│    ✓ 个人中心 (账户/充值/订单)                                     │
│    ✓ 代理面板 (下拉切换 → 下级管理/佣金看板/提现/推广链接)         │
│    ✓ 企业空间 (下拉切换 → 成员管理/企业项目/企业素材库)            │
│    ✓ DIY 编辑器 / 模板市场                                        │
│    ✗ 不碰: 任何后台管理功能                                        │
│    ✗ 不碰: 用户数据查询/审核/运营操作                              │
└──────────────────────────────────────────────────────────────────┘
```

---

## 三、身份鉴权体系

### 3.1 JWT Payload 标准字段

```json
{
  "userId": 1001,
  "role": "user",
  "nickname": "张三",
  "tenantId": 0,
  "aud": "consumer",
  "entId": null,
  "entRole": null,
  "roles": ["agent", "enterprise"],
  "activeRole": "agent",
  "agentId": 42,
  "iat": 1700000000,
  "exp": 1700000900
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `userId` | number | 全局唯一用户ID |
| `role` | string | 基础角色: `user` / `admin` / `ops` |
| `aud` | string | 登录端: `consumer` / `admin` / `ops` |
| `entId` | number\|null | 所属企业ID（企业成员时非空） |
| `entRole` | string\|null | 企业内角色: `owner` / `admin` / `member` |
| `roles` | string[] | **多身份列表**: `["agent"]` / `["enterprise"]` / `["agent","enterprise"]` |
| `activeRole` | string | 当前激活身份: `"user"` / `"agent"` / `"enterprise"` |
| `agentId` | number\|null | 代理ID（当 activeRole=agent 时） |

### 3.2 三端认证隔离（JWT 密钥拆分）

```
端1 (admin):   JWT_ADMIN_SECRET (独立密钥, 长度≥32)
端2 (ops):     JWT_OPS_SECRET   (独立密钥, 长度≥32)
端3 (consumer):JWT_SECRET       (现有密钥)

端1 token 无法访问端2 API，端2 token 无法访问端1 API。
端3 token 不携带 admin/ops aud，天然隔离。
```

### 3.3 后端中间件链

```javascript
// app.js 路由挂载顺序

// === 端1: /api/admin/* ===
router.use('/api/admin',
  adminLimiter,           // 独立限流 (60/min)
  tenantContext,          // 租户上下文
  adminAuthMiddleware,    // 验证 JWT + aud=admin
  superAdminAuth,         // 验证 role=super_admin
  rbac,                   // 细粒度权限
);

// === 端2: /api/ops/* ===
router.use('/api/ops',
  opsLimiter,             // 独立限流 (120/min)
  tenantContext,
  opsAuthMiddleware,      // 验证 JWT + aud=ops
  opsRbac,                // ops RBAC (运营/财务/审核)
);

// === 端3: /api/* (默认) ===
router.use('/api',
  authMiddleware,         // 现有全局认证
  paramFilter,            // 输入过滤
  csrf,                   // CSRF
  rateLimiter,            // 用户限流
  tenantContext,
);

// 端1/端2 路由优先匹配，端3 作为 fallback
```

### 3.4 端3 内多身份切换鉴权

```javascript
// middleware/auth.js 新增身份守卫

/** 要求 activeRole=agent */
export function agentActiveRole(req, res, next) {
  if (!req.user || req.user.activeRole !== 'agent') {
    return sendError(res, ERROR_CODE.EC_AUTH_009);
  }
  req.agentId = req.user.agentId;
  next();
}

/** 要求 activeRole=enterprise */
export function enterpriseActiveRole(req, res, next) {
  if (!req.user || req.user.activeRole !== 'enterprise') {
    return sendError(res, ERROR_CODE.EC_AUTH_010);
  }
  req.entId = req.user.entId;
  next();
}

/** 要求拥有代理身份（不管当前是否激活） */
export function hasAgentIdentity(req, res, next) {
  if (!req.user?.roles?.includes('agent')) {
    return sendError(res, ERROR_CODE.EC_AUTH_011);
  }
  next();
}

/** 要求拥有企业身份（不管当前是否激活） */
export function hasEnterpriseIdentity(req, res, next) {
  if (!req.user?.roles?.includes('enterprise')) {
    return sendError(res, ERROR_CODE.EC_AUTH_012);
  }
  next();
}
```

### 3.5 前端身份切换流程

```
用户登录 (work.movio.cn/login)
  │
  ├─ 后端返回 JWT (roles: ["agent","enterprise"], activeRole: "user")
  │
  ├─ 前端 store 读取 roles[], 顶部渲染下拉菜单
  │   ┌──────────────────────────────┐
  │   │  🔽 个人用户 ▼               │
  │   │  ─────────────────────────   │
  │   │  · 个人创作                  │
  │   │  · 🏪 代理管理 (代理ID:42)    │  ← roles.includes('agent')
  │   │  · 🏢 企业空间 (XX科技)      │  ← roles.includes('enterprise')
  │   └──────────────────────────────┘
  │
  ├─ 用户选择 "代理管理"
  │   → POST /api/auth/switch-role { activeRole: "agent" }
  │   → 后端验证 roles.includes("agent") → 签发新 JWT (activeRole: "agent", agentId: 42)
  │   → 前端切换到 agent 布局 (侧边栏变为: 下级管理/佣金/提现/推广)
  │
  ├─ 用户选择 "企业空间"
  │   → POST /api/auth/switch-role { activeRole: "enterprise" }
  │   → 后端验证 roles.includes("enterprise") → 签发新 JWT (activeRole: "enterprise", entId: 100)
  │   → 前端切换到 enterprise 布局 (侧边栏变为: 成员/项目/素材库)
  │
  └─ 用户选择 "个人创作"
      → 回到默认 user 布局
```

---

## 四、路由规划（完整）

### 4.1 端1 — 平台运维总后台

| 路由前缀 | 页面 | 中间件 |
|----------|------|--------|
| `/admin/dashboard` | 系统概览 | adminAuth + superAdmin |
| `/admin/config/system` | 全局系统配置 | adminAuth + superAdmin |
| `/admin/config/security` | WAF/IP黑名单/限流策略 | adminAuth + superAdmin |
| `/admin/config/model-providers` | 模型供应商管理 | adminAuth + superAdmin |
| `/admin/config/tenant-switches` | 租户开关 | adminAuth + superAdmin |
| `/admin/keys/jwt` | JWT密钥管理 | adminAuth + superAdmin |
| `/admin/keys/encryption` | 加密密钥轮换 | adminAuth + superAdmin |
| `/admin/keys/api-credentials` | API凭证管理 | adminAuth + superAdmin |
| `/admin/audit-log` | 安全审计日志 | adminAuth + superAdmin |
| `/admin/monitor/db` | DB监控 (慢查询/连接池) | adminAuth + superAdmin |
| `/admin/monitor/redis` | Redis监控 | adminAuth + superAdmin |
| `/admin/monitor/gateway` | Gateway 熔断/吞吐 | adminAuth + superAdmin |
| `/admin/backup` | DB备份管理 | adminAuth + superAdmin |

**Layout**: `platform-admin.vue` — 深色主题，侧边栏导航，技术风格

### 4.2 端2 — 业务运营后台

| 路由前缀 | 页面 | 权限角色 |
|----------|------|----------|
| `/ops/dashboard` | 运营Dashboard | ops_viewer+ |
| `/ops/users` | 用户管理 | ops_viewer+ |
| `/ops/users/:id` | 用户详情 | ops_viewer+ |
| `/ops/agents` | 代理管理 | ops_operator+ |
| `/ops/agents/:id` | 代理详情+分佣配置 | ops_operator+ |
| `/ops/enterprises` | 企业管理 | ops_operator+ |
| `/ops/enterprises/:id` | 企业详情+审核 | ops_operator+ |
| `/ops/orders` | 订单管理 | ops_viewer+ |
| `/ops/recharge` | 充值/退款处理 | finance |
| `/ops/commission` | 分账对账 | finance |
| `/ops/campaigns` | 活动配置 | ops_operator+ |
| `/ops/coupons` | 优惠券管理 | ops_operator+ |
| `/ops/content-review` | 内容审核队列 | auditor |
| `/ops/content-review/:id` | 审核详情 | auditor |
| `/ops/business-gateway` | 业务网关（模板/活动/行业开关） | ops_admin |
| `/ops/reports` | 数据报表 | ops_viewer+ |
| `/ops/reports/finance` | 财务报表 | finance |
| `/ops/logs/operations` | 操作日志 | ops_admin |

**Layout**: `business-ops.vue` — 标准后台 UI，左侧多级菜单，明亮主题

### 4.3 端3 — 统一用户工作台

**默认用户模式** (`activeRole: user`)：

| 路由前缀 | 页面 |
|----------|------|
| `/work` | 工作台首页 |
| `/work/projects` | 我的项目 |
| `/work/projects/:id` | 项目详情 |
| `/work/image-gen` | AI图片生成 |
| `/work/video-gen` | AI视频生成 |
| `/work/text-gen` | AI文案生成 |
| `/work/voice-gen` | AI配音 |
| `/work/templates` | 模板市场 |
| `/work/diy/:id` | DIY编辑器 |
| `/work/account` | 个人中心 |
| `/work/account/orders` | 我的订单 |
| `/work/account/recharge` | 充值 |
| `/work/account/settings` | 账号设置 |

**代理模式** (`activeRole: agent`)：

| 路由前缀 | 页面 | 鉴权 |
|----------|------|------|
| `/work/agent/dashboard` | 代理Dashboard | agentActiveRole |
| `/work/agent/sub-agents` | 下级代理管理 | agentActiveRole |
| `/work/agent/commission` | 佣金看板 | agentActiveRole |
| `/work/agent/withdraw` | 提现 | agentActiveRole |
| `/work/agent/promotion` | 推广链接/素材 | agentActiveRole |
| `/work/agent/customers` | 我的客户 | agentActiveRole |

**企业模式** (`activeRole: enterprise`)：

| 路由前缀 | 页面 | 鉴权 |
|----------|------|------|
| `/work/enterprise/dashboard` | 企业Dashboard | enterpriseActiveRole |
| `/work/enterprise/members` | 成员管理 | enterpriseActiveRole, entRole=admin |
| `/work/enterprise/projects` | 企业项目 | enterpriseActiveRole |
| `/work/enterprise/assets` | 企业素材库 | enterpriseActiveRole |
| `/work/enterprise/settings` | 企业设置 | enterpriseActiveRole, entRole=owner |
| `/work/enterprise/billing` | 企业账单 | enterpriseActiveRole, entRole=owner |

**Layout**: `user-workspace.vue` — 现代 SaaS UI，顶部导航 + 身份下拉 + 动态侧边栏

---

## 五、Layout 设计

### 5.1 Layout 合并方案（9 → 4）

| 原 Layout | 新 Layout | 合并逻辑 |
|-----------|-----------|----------|
| `admin.vue` + `gateway.vue` | `platform-admin.vue` | 网关运维合入总后台（深层技术菜单） |
| `ops.vue` + `finance.vue` | `business-ops.vue` | 财务合入运营后台（财务角色可见财务菜单） |
| `default.vue` + `workspace.vue` + `enterprise.vue` | `user-workspace.vue` | 三合一，activeRole 驱动侧边栏 |
| `agent.vue` | **删除**（合入 user-workspace.vue） | 代理面板通过 activeRole=agent 动态渲染 |
| `landing.vue` | 保留 | 落地页/未登录 |

**最终 Layout 清单**：`platform-admin.vue` / `business-ops.vue` / `user-workspace.vue` / `landing.vue`

### 5.2 `user-workspace.vue` 核心结构

```vue
<template>
  <div class="workspace-layout" :class="`mode-${activeRole}`">
    <!-- 顶部导航（全模式共享） -->
    <header class="top-bar">
      <Logo />
      <MainNav />  <!-- AI工具 / 模板市场 / 项目 -->
      <div class="right">
        <!-- 身份切换下拉 -->
        <RoleSwitcher
          v-if="hasMultipleRoles"
          :roles="userRoles"
          :active="activeRole"
          @switch="handleRoleSwitch"
        />
        <UserMenu />
      </div>
    </header>

    <div class="body">
      <!-- 侧边栏（按 activeRole 动态渲染） -->
      <aside class="sidebar" :key="activeRole">
        <SidebarUser v-if="activeRole === 'user'" />
        <SidebarAgent v-if="activeRole === 'agent'" />
        <SidebarEnterprise v-if="activeRole === 'enterprise'" />
      </aside>

      <main class="content">
        <NuxtPage />
      </main>
    </div>
  </div>
</template>
```

---

## 六、权限字段设计（SQL）

```sql
-- users 表新增字段
ALTER TABLE users
  ADD COLUMN roles JSON NOT NULL DEFAULT '[]' COMMENT '多身份: ["agent","enterprise"]',
  ADD COLUMN active_role ENUM('user','agent','enterprise') NOT NULL DEFAULT 'user',
  ADD COLUMN agent_id INT UNSIGNED NULL COMMENT '关联 agents.id',
  ADD COLUMN agent_status ENUM('pending','active','suspended') NULL,
  ADD INDEX idx_roles ( (CAST(roles AS CHAR(64) ARRAY)) ),
  ADD INDEX idx_active_role (active_role),
  ADD INDEX idx_agent_id (agent_id);

-- 端2 运营角色表
CREATE TABLE ops_roles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  role ENUM('ops_admin','ops_operator','ops_viewer','finance','auditor') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 端1 超管标识（复用 users.role）
-- users.role = 'super_admin' 且 users.aud = 'admin'
```

### 权限矩阵

| 操作 | super_admin | ops_admin | ops_operator | ops_viewer | finance | auditor | user |
|------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| 管理模型供应商Key | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| 管理JWT密钥 | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| WAF/IP黑名单 | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| 用户CRUD | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| 用户冻结/解封 | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| 代理分佣配置 | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| 提现审核 | ✗ | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ |
| 活动配置 | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| 对账 | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ |
| 退款处理 | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ |
| 内容审核 | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |
| 查看Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| AI工具 | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| 代理面板 | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓† |
| 企业空间 | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓‡ |

> ✓† = 需 `roles` 含 `agent`  
> ✓‡ = 需 `roles` 含 `enterprise`

---

## 七、数据隔离规则

### 7.1 三层隔离模型

```
L0 — 全局层 (tenantId=0, 无隔离)
  ├─ 系统配置 / JWT密钥 / WAF规则 / 模型供应商
  ├─ 模板市场(公共) / 行业分类
  └─ 仅端1可读写

L1 — 运营层 (tenantId=0, aud=ops)
  ├─ 用户表 / 代理表 / 企业表 / 订单表 / 佣金表
  ├─ 活动配置 / 审核记录
  └─ 端2读写, 端3读自己

L2 — 用户层 (tenantId=userId 或 tenantId=entId)
  ├─ 项目 / 素材 / 生成记录 / DIY配置
  ├─ 代理下级 / 佣金明细 / 企业成员 / 企业素材库
  └─ 端3读写 (own data only)
```

### 7.2 SQL 层强制隔离

```sql
-- 用户数据：只查自己
SELECT * FROM projects WHERE user_id = ?;

-- 企业数据：同企业成员可见
SELECT * FROM enterprise_assets WHERE ent_id = ?;

-- 代理数据：只能查自己的下级
SELECT * FROM agent_commissions WHERE agent_id = ? OR parent_agent_id = ?;
```

### 7.3 DAO 层守卫

```javascript
// dao/projectDao.js — 所有查询强制注入 userId/entId
async function findByUser(userId, filters) {
  const sql = 'SELECT * FROM projects WHERE user_id = ? ...';
  return query(sql, [userId, ...filters]);
}

// 企业级资源自动 scoping
async function findEnterpriseAssets(req) {
  if (req.user.activeRole === 'enterprise') {
    return query('SELECT * FROM enterprise_assets WHERE ent_id = ?', [req.user.entId]);
  }
  throw new BusinessError(ERROR_CODE.EC_AUTH_010);
}
```

---

## 八、Nginx 四域名反代

```nginx
# admin.movio.internal — 端1 平台运维总后台
server {
    server_name admin.movio.internal;
    # 内网/VPN 接入，公网不可达
    allow 10.0.0.0/8;
    allow 172.16.0.0/12;
    deny all;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header X-Portal admin;
    }
}

# ops.movio.cn — 端2 业务运营后台
server {
    server_name ops.movio.cn;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header X-Portal ops;
    }
    # 可选 IP 白名单
    # allow 203.0.113.0/24;
    # deny all;
}

# work.movio.cn — 端3 统一用户工作台
server {
    server_name work.movio.cn;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header X-Portal consumer;
    }
}

# movio.cn — 官网/落地页
server {
    server_name movio.cn www.movio.cn;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header X-Portal landing;
    }
}
```

---

## 九、Nuxt 多入口路由

```typescript
// client/nuxt.config.ts 路由规则
export default defineNuxtConfig({
  // ...
  hooks: {
    'pages:extend'(pages) {
      // 端1: /admin/* → platform-admin layout
      pages.forEach(p => {
        if (p.path.startsWith('/admin')) {
          p.meta = { ...p.meta, layout: 'platform-admin', middleware: ['admin-auth'] };
        }
      });
      // 端2: /ops/* → business-ops layout
      pages.forEach(p => {
        if (p.path.startsWith('/ops')) {
          p.meta = { ...p.meta, layout: 'business-ops', middleware: ['ops-auth'] };
        }
      });
      // 端3: /work/* → user-workspace layout
      pages.forEach(p => {
        if (p.path.startsWith('/work')) {
          p.meta = { ...p.meta, layout: 'user-workspace' };
        }
      });
    }
  }
});
```

---

## 十、实施路线图

### Phase 1: Layout 合并（3天）

| 天数 | 任务 | 产出 |
|:--:|------|------|
| D1 | `admin.vue` + `gateway.vue` → `platform-admin.vue` | 网关菜单合入技术菜单子项 |
| D2 | `ops.vue` + `finance.vue` → `business-ops.vue` | 财务菜单按角色可见 |
| D2 | `default.vue` + `workspace.vue` + `enterprise.vue` → `user-workspace.vue` | 动态侧边栏切换 |
| D3 | 删除 `agent.vue`、`finance.vue`、`gateway.vue` 等废弃Layout | 清理 + 全量回归测试 |

### Phase 2: 后端加固（2天）

| 天数 | 任务 | 产出 |
|:--:|------|------|
| D4 | 新增 `agentActiveRole` / `enterpriseActiveRole` / `hasAgentIdentity` / `hasEnterpriseIdentity` 中间件 | |
| D4 | 新增 `POST /api/auth/switch-role` 端点 + Zod 校验 | |
| D5 | JWT 密钥拆分: `JWT_ADMIN_SECRET` / `JWT_OPS_SECRET` 环境变量 | |
| D5 | 端1/端2 中间件链挂载 (`adminAuthMiddleware` / `opsAuthMiddleware`) | |

### Phase 3: Nginx + 部署配置（1天）

| 天数 | 任务 |
|:--:|------|
| D6 | 4 域名 Nginx 配置 + SSL 证书 |
| D6 | 端1 内网/VPN 访问限制 |
| D6 | Nuxt `pages:extend` hook 路由映射 |

### Phase 4: 代理/企业独立域名预留（架构预留，Phase 2.1 实施）

```
未来升级路径（零重构）:
  agent.movio.cn → Nginx 新增 server block → Nuxt 新增 route prefix
  → 复用 user-workspace layout，activeRole 硬编码为 'agent'
  → 零后端改动，零前端组件改动
```

### 全量工期：6 个工作日

---

## 十一、改动量汇总

| 层级 | 改动类型 | 改动量 |
|------|----------|:--:|
| Layout | 9→4 合并 + 动态侧边栏 | ~250行 |
| Pages | enterprise/ 目录迁移 | ~50行 |
| Auth 中间件 | +4 身份守卫 + switch-role 端点 | ~80行 |
| Config | JWT 密钥拆分 | ~20行 |
| Nuxt | pages:extend + middleware | ~30行 |
| Nginx | 新文件 | ~50行 |
| 删除 | 5 废弃 Layout + 冗余导航组件 | 删除 ~300行 |
| **净改动** | | **~180行新增** |

---

## 十二、方案D vs 方案B/C 最终对比

| 维度 | 方案B (4端) | 方案C (3端 危险版) | **方案D (3端改良)** |
|------|:--:|:--:|:--:|
| 安全性 | A | D (等保不合规) | **A** |
| 运营效率 | A | B | **A** |
| 代理体验 | A (独立站) | C (内嵌) | **B+** (内嵌+预留独立) |
| 企业体验 | A | C | **A** |
| 开发成本 | 中 (4 Layout) | 低 (3 Layout) | **低** (3 Layout) |
| 维护成本 | 中 (4 CI/CD) | 低 | **低** (3 CI/CD) |
| 拓展性 | A | B | **A** (代理/企业可独立) |
| 方案C的致命缺陷 | — | 基础设施与业务耦合 | **已修复** |

**结论：方案D 在保持方案B安全水平的前提下，将开发/维护成本降至方案C水平。是最优落地解。**
