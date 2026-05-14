# Decision 025: 三端架构选型与落地蓝图

**日期**: 2026-05-15 | **状态**: 方案评估 | **作者**: G2 项目统筹组

---

## 一、三端架构定义

```
┌─────────────────────────────────────────────────────────────────┐
│                     Movio AI 三端架构                              │
├───────────────┬───────────────────┬──────────────────────────────┤
│  第一端        │   第二端            │   第三端                       │
│  平台总后台     │   运营业务后台       │   统一用户工作台                 │
├───────────────┼───────────────────┼──────────────────────────────┤
│  超级管理员专用  │   运营/财务/审核人员   │   普通用户 + 代理 + 企业        │
│  底层配置管控   │   日常业务运营       │   三合一, 自动识别角色            │
└───────────────┴───────────────────┴──────────────────────────────┘
```

---

## 二、多维评估矩阵

### 2.1 安全维度

| 评估项 | 三端架构 | 二端架构(总后台+统一前端) | 评估 |
|------|---------|--------------------------|------|
| **攻击面** | 3 个入口，但每个入口权限域严格隔离 | 2 个入口，ops 功能混在 admin 内 | 二端略优(少一个入口)，但三端隔离更彻底 |
| **横向移动风险** | 用户端 RCE **无法**触及 WAF/密钥/租户开关 | 用户端 RCE **无法**触及 admin，但 ops 功能与 admin 同域 | **三端明显胜出** |
| **权限显式化** | 三套独立中间件链，无隐式继承 | admin 中间件覆盖 gateway/finance/ops，权限语义模糊 | **三端胜出** |
| **审计追踪** | 各端独立审计日志流 | 混合日志需按路径过滤 | 三端胜出 |
| **凭据隔离** | 总后台可强制 MFA + 独立 JWT secret | admin 和 ops 共用 cookie 域 | **三端胜出** |
| **合规** | 总后台可独立做 SOC2/ISO27001 审计域 | 功能混合增加合规审计范围 | **三端胜出** |

**安全结论**: 三端架构在安全隔离上全面优于二端。总后台独立部署(可选独立域名/子域)后，即使第二、第三端全部沦陷，WAF规则、加密密钥、租户开关等底层配置不被触及。

### 2.2 易用性维度

| 评估项 | 三端架构 | 二端架构 | 评估 |
|------|---------|----------|------|
| **超级管理员** | 纯基础设施视图，无业务噪音 | admin 侧边栏混杂 10 个分组 | **三端胜出** |
| **运营人员** | 独立工作台，只看业务数据 | 与系统配置同一界面，权限报错频繁 | **三端胜出** |
| **用户/代理/企业** | 一套 UI，角色自动切换入口 | 同左 | **持平** |
| **跨身份切换** | 代理+企业双身份一键切换 | 同左(前端实现) | **持平** |
| **URL 记忆** | 三个域名/路径，需分别收藏 | 两个入口 | 二端略优 |

**易用性结论**: 三端架构对运营人员和超级管理员显著更友好——各自只看到自己需要的界面。

### 2.3 扩展性维度

| 评估项 | 三端架构 | 二端架构 | 评估 |
|------|---------|----------|------|
| **新增业务线** | 运营端新增模块，不动总后台 | admin 内新增导航组 | **三端胜出** |
| **新增用户角色** | 工作台新增入口/权限点 | 同左 | **持平** |
| **独立技术栈** | 三端可逐步替换(如运营端迁 React) | admin 整体迁移 | **三端胜出** |
| **CI/CD** | 3 条独立流水线 | 2 条 | 二端略优 |
| **微前端拆分** | 天然三应用，未来拆分零成本 | admin 拆分需先解耦 gateway/finance/ops | **三端胜出** |

### 2.4 技术实现维度

| 评估项 | 三端架构 | 二端架构 | 评估 |
|------|---------|----------|------|
| **初期开发量** | ~25d (三套 Layout + 路由 + 中间件) | ~15d (两套) | 二端略优 |
| **共享组件复用** | 需建 shared 包，三端引用 | admin 内直接 import | 二端略优 |
| **数据库改造** | 新增 role_permission 表 + 迁移脚本 | 仅调整 RBAC 中间件 | **持平** |
| **现有代码兼容** | 6 套 Layout → 合并为 3 套 | 保持不变 | 三端略高 |
| **长期维护** | 职责边界清晰，修改不相互影响 | admin 模块耦合风险 | **三端胜出** |

---

## 三、二端 vs 三端 量化对比

| 维度 | 二端 | 三端 | 胜出 |
|------|:--:|:--:|:--:|
| 初期开发工期 | 15d | 25d | 二端 |
| 安全隔离度 | ★★★ | ★★★★★ | **三端** |
| 运营人员体验 | ★★★ | ★★★★★ | **三端** |
| 超级管理员体验 | ★★★ | ★★★★★ | **三端** |
| 后期拆分成本 | ★★ | ★★★★★ | **三端** |
| 合规审计友好 | ★★★ | ★★★★★ | **三端** |
| 维护心智负担 | ★★★ | ★★★★ | **三端** |
| 综合评分 | 20/35 | **32/35** | **三端** |

---

## 四、最终推荐：三端架构 + 渐进落地

### 4.1 推荐理由

1. **当前 6 套 AdminLayout(gateway/finance/ops/agent/admin/enterprise)散乱**，三端架构本质上是对现有 Layout 的重组归并，非从零建设
2. **安全隔离是 SaaS 刚需**，WAF/密钥/租户开关必须与业务功能物理(或至少逻辑)隔离
3. **增加 10d 初期投入，换取 5 年内零拆分成本**
4. **运营端独立后，可单独授权给外包运营团队**，无需开放系统配置权限

### 4.2 现架构 → 目标架构 映射

```
现状(9 Layouts)                      目标(3 Layouts)
───────────────────────────          ───────────────────────────
admin.vue        ─┐                  
gateway.vue       ├── AdminShell ──→ 端1: super-admin.vue
finance.vue       │                  (平台总后台, 1 套 Layout)
ops.vue          ─┘                  
agent.vue        ─┐ admin/users
                  │ admin/content    端2: ops-admin.vue
admin/users       │ admin/messages   (运营业务后台, 1 套 Layout)
admin/content     ├─→ 运营功能整合 ──→ 
admin/messages    │ + enterprise管理
...              ─┘

default.vue      ─┐ /work/*          
workspace.vue     │ /account/*        端3: workspace.vue
enterprise.vue    ├─→ 三合一整合 ──→  (统一用户工作台, 1 套 Layout)
landing.vue      ─┘ /login /help...
```

**优化效果**: 9 套 Layout → **3 套 Layout**，6 套 AdminShell 合并为 2 套。

---

## 五、完整落地架构方案

### 5.1 路由规划

#### 端1: 平台总后台 — `/sys/` (或独立子域 `sys.movio.ai`)

```
/sys/
├── dashboard              # 系统总览(节点状态/QPS/错误率)
├── gateway/
│   ├── routes             # 网关路由表(ToAPIs/StabilityAI/等)
│   ├── rate-limit         # 全局限流配置
│   └── fallback           # 降级策略
├── security/
│   ├── waf                # WAF规则(IP黑名单/CC防护/UA过滤)
│   ├── keys               # 加密密钥管理
│   ├── audit-log          # 安全审计日志
│   └── sessions           # 活跃会话监控
├── tenants/
│   ├── list               # 租户列表
│   ├── switches           # 租户功能开关(模块启用/禁用)
│   └── quotas             # 租户资源配额
├── system/
│   ├── params             # 全局系统参数
│   ├── models             # AI模型池配置
│   ├── storage            # 存储策略(COS/OSS/S3)
│   └── jobs               # 定时任务管理
└── deploy/
    ├── versions           # 版本历史
    └── config             # 部署配置
```

**Layout**: `super-admin.vue` — 深色侧边栏(#0a0e1a)，6 组导航，仅 `/sys/*` 路由

#### 端2: 运营业务后台 — `/ops/`

```
/ops/
├── dashboard              # 运营总览(DAU/营收/订单量)
├── users/
│   ├── list               # 用户列表(搜索/封禁/详情)
│   ├── agents             # 代理列表(审核/等级/分佣)
│   └── enterprises        # 企业列表(认证/套餐/到期)
├── content/
│   ├── review             # 内容审核队列(图片/视频)
│   ├── reports            # 举报处理
│   └── templates          # 官方模板管理
├── finance/
│   ├── orders             # 订单管理
│   ├── commissions        # 代理佣金
│   ├── settlements        # 企业分账
│   ├── recharge            # 充值记录
│   └── invoices           # 发票管理
├── campaigns/
│   ├── list               # 活动列表
│   ├── coupons             # 优惠券
│   └── banners            # Banner管理
├── messages/
│   ├── push               # 推送任务
│   ├── sms                # 短信记录
│   └── email              # 邮件记录
├── biz-gateway/
│   ├── switches           # 业务开关(图片/视频/3D等功能开关)
│   └── pricing             # 定价策略配置
└── analytics/
    ├── reports             # 数据报表
    └── export              # 数据导出
```

**Layout**: `ops-admin.vue` — 浅色侧边栏，8 组导航，仅 `/ops/*` 路由

#### 端3: 统一用户工作台 — 多前缀

```
/                       # 落地页(landing)
/login                  # 登录
/register               # 注册
/help                   # 帮助中心
/compare                # 方案对比
/legal/*                # 法律条款

/work/*                 # AI创作工作台(图片/视频/3D)
/workspace/*             # 个人工作区
/account/*              # 账号设置/会员/积分
/my/*                   # 我的内容/收藏
/assets/*               # 素材库
/diy/*                  # DIY编辑器

# 代理专属入口(代理角色可见)
/agent/
├── dashboard            # 代理后台首页
├── customers            # 客户列表
├── commissions          # 佣金明细
└── tools                # 代理工具(推广链接/海报)

# 企业专属入口(企业角色可见)
/enterprise/
├── dashboard            # 企业后台首页
├── users                # 企业成员管理
├── channels             # 渠道管理
├── distribution         # 分销管理
├── commerce             # 电商管理
├── finance/             # 企业财务
├── reports              # 企业报表
├── whitelabel           # 白标设置
└── settings             # 企业设置
```

**Layout**: `workspace.vue` — 自适应侧边栏(普通用户 5 项 / 代理 +3 项 / 企业 +8 项 / 双身份全显示)

### 5.2 Layout 划分

| Layout | 对应端 | 文件名 | 侧边栏 | 鉴权方式 |
|--------|:--:|------|------|------|
| 平台总后台 | 端1 | `layouts/super-admin.vue` | SuperAdminShell (深色) | `super_admin` role only |
| 运营业务后台 | 端2 | `layouts/ops-admin.vue` | OpsAdminShell (浅色) | `admin`+ role |
| 用户工作台 | 端3 | `layouts/workspace.vue` | WorkspaceShell (自适应) | 登录即可, 前端按 role 展示 |
| 落地页 | 端3 | `layouts/landing.vue` | 无侧边栏 | 无 |

**删除的 Layout** (合并/废弃): `admin.vue`, `enterprise.vue`, `gateway.vue`, `finance.vue`, `ops.vue`, `agent.vue`, `default.vue`

### 5.3 权限字段设计

#### 数据库: `users` 表新增字段

```sql
ALTER TABLE users ADD COLUMN roles JSON DEFAULT '[]' COMMENT '多角色数组';

-- 示例: 一个用户同时是代理 + 企业管理员
-- roles = ['agent_admin', 'enterprise_admin']

-- 迁移逻辑: 旧 role 字段映射
-- 'user'     → roles = ['user']
-- 'admin'    → roles = ['admin']
-- 'super_admin' → roles = ['super_admin']
```

#### JWT Payload 结构

```json
{
  "userId": 10086,
  "roles": ["user", "agent_admin", "enterprise_admin"],
  "activeRole": "user",          // 当前激活角色
  "tenantId": "tenant_001",
  "aud": "workspace",            // 端标识: 'super_admin' | 'ops_admin' | 'workspace'
  "iat": 1715760000,
  "exp": 1715760900
}
```

#### 权限点扩展 (在现有 22 个基础上)

现有 RBAC 10 角色 + 22 权限点已覆盖核心功能。本次新增 **端访问控制权限**:

| 权限点 | 级别 | 说明 |
|------|:--:|------|
| `portal:super_admin` | SUPER_ADMIN(4) | 可访问端1 |
| `portal:ops_admin` | ADMIN(3)+ | 可访问端2 |
| `portal:workspace` | USER(1)+ | 可访问端3(所有登录用户) |

### 5.4 身份鉴权规则

#### 三端独立中间件链

```javascript
// 端1: super-admin.vue → definePageMeta({ middleware: ['super-admin'] })
// server/src/middleware/auth.js 新增:
function superAdminPortalAuth(req, res, next) {
  authMiddleware(req, res, () => {
    if (!hasPermission(req.user, 'portal:super_admin')) {
      return res.status(403).json({ code: 'EC_AUTH_011', message: '仅超级管理员可访问' })
    }
    next()
  })
}

// 端2: ops-admin.vue → definePageMeta({ middleware: ['ops-admin'] })
function opsAdminPortalAuth(req, res, next) {
  authMiddleware(req, res, () => {
    if (!hasPermission(req.user, 'portal:ops_admin')) {
      return res.status(403).json({ code: 'EC_AUTH_012', message: '仅运营人员可访问' })
    }
    next()
  })
}

// 端3: workspace.vue → definePageMeta({ middleware: ['auth'] })
// 现有 authMiddleware 即可
```

#### 客户端中间件 (`middleware/` 目录)

```
client/middleware/
├── auth.global.ts            # 全局(保留): 公开路径白名单 + /sys/→super_admin 角色校验
├── super-admin.ts            # 端1专用: require ['super_admin']
├── ops-admin.ts              # 端2专用: require ['admin','super_admin']
└── role-based-nav.ts         # 端3专用: 前端侧边栏条件渲染(非安全, 仅 UX)
```

#### 端3 多角色切换流程

```
用户登录 → JWT roles: ['user','agent_admin','enterprise_admin']
         → 默认 activeRole: 'user'
         → 前端显示: 普通用户界面 + 顶部"代理管理"+"企业管理"入口
         
点击"代理管理" → PATCH /api/auth/switch-role { role: 'agent_admin' }
              → 后端更新 JWT activeRole → 签发新 cookie
              → 前端侧边栏展开代理菜单项

点击"企业管理" → PATCH /api/auth/switch-role { role: 'enterprise_admin' }
              → 同上流程
```

**关键**: 角色切换不重新登录，后端校验 `roles` 数组包含目标角色后才允许切换。

### 5.5 数据隔离规则

| 隔离层 | 端1 | 端2 | 端3 |
|------|------|------|------|
| **数据库** | 同一 MySQL，不同表域 | 同左 | 同左 |
| **行级隔离** | 无(全局可见) | 按 tenant_id(运营跨租户) | **强制 tenant_id** |
| **API 可见性** | 全量 API | 运营相关 API | 用户态 API |
| **Redis namespace** | `sys:` 前缀 | `ops:` 前缀 | `user:` + `tenant:` 前缀 |
| **文件存储** | 系统配置文件 | 运营报表导出 | 用户素材/作品 |
| **审计日志** | `audit_log_sys` 表 | `audit_log_ops` 表 | `audit_log_user` 表 |

#### DAO 层数据隔离实现

```javascript
// 端3: 所有查询自动注入 tenant_id
// server/src/dao/baseDao.js 新增
function withTenant(query, user) {
  if (user.roles.includes('super_admin') || user.roles.includes('admin')) {
    return query  // 超级管理员/运营跨租户查询
  }
  return query.where({ tenant_id: user.tenantId })  // 普通用户/代理/企业强制隔离
}
```

### 5.6 各端职责边界清单

#### 端1: 平台总后台 — **只做底层，不做业务**

| ✅ 做 | ❌ 不做 |
|------|------|
| 全局系统参数配置 | 用户管理(封禁/解封归运营端) |
| AI 网关路由/限流/降级 | 内容审核 |
| WAF 规则/IP黑名单/CC防护 | 订单/佣金/分账 |
| 加密密钥轮换 | 活动配置 |
| 租户创建/开关/配额 | 推送/短信/邮件 |
| 存储策略(COS/OSS/S3) | 业务功能开关(归运营端) |
| 部署配置/版本管理 | 定价策略(归运营端) |
| 安全审计日志 | 数据报表 |
| DB 连接池/Redis 集群配置 | 企业认证审核(归运营端) |

#### 端2: 运营业务后台 — **只做业务，不碰底层**

| ✅ 做 | ❌ 不做 |
|------|------|
| 用户/代理/企业管理(CRUD) | 系统参数 |
| 内容审核队列 | WAF 规则 |
| 订单/佣金/分账/发票 | 加密密钥 |
| 活动/优惠券/Banner | 租户开关(只能提申请) |
| 推送/短信/邮件 | 存储策略 |
| 业务功能开关(图片/视频/3D) | 部署配置 |
| 定价策略 | 网关路由 |
| 数据报表/导出 | DB 连接池 |
| 企业认证审核 | 安全审计日志(View-Only) |

#### 端3: 统一用户工作台 — **只做使用，不碰管理**

| ✅ 做 | ❌ 不做 |
|------|------|
| AI 创作(图片/视频/3D) | 任何管理功能 |
| 个人素材管理 | 用户列表 |
| 账号设置/会员/积分 | 内容审核 |
| 代理: 客户管理/佣金查看 | 系统配置 |
| 企业: 成员管理/渠道/分销/财务 | 定价修改 |
| 方案对比/帮助中心 | 订单管理(仅查看自己的) |

---

## 六、实施路径

### Phase 1: 权限底座 (5d, P0)

| 任务 | 工时 | 负责 |
|------|:--:|:--:|
| `users.roles` JSON 列 migration | 0.5d | G6 |
| JWT payload 扩展 roles + activeRole | 0.5d | G6 |
| `portal:*` 权限点注册到 RBAC | 0.5d | G5 |
| `superAdminPortalAuth` / `opsAdminPortalAuth` 中间件 | 1.0d | G5 |
| `useAuthStore` 扩展: roles/hasRole/activeRole | 1.0d | G4 |
| 客户端中间件: `super-admin.ts` / `ops-admin.ts` | 0.5d | G4 |
| `/api/auth/switch-role` 端点 | 1.0d | G5 |

### Phase 2: 路由重排 (8d, P0)

| 任务 | 工时 | 负责 |
|------|:--:|:--:|
| 端1 Layout `super-admin.vue` + SuperAdminShell | 1.5d | G4 |
| 端2 Layout `ops-admin.vue` + OpsAdminShell | 1.5d | G4 |
| 端3 Layout `workspace.vue` 改造(自适应侧边栏) | 2.0d | G4 |
| 路由迁移: `/admin/system/*` → `/sys/*` | 1.5d | G4 |
| 路由迁移: `/admin/users|content|finance|campaigns|messages/*` → `/ops/*` | 1.0d | G4 |
| 路由迁移: `/enterprise/*` → `/enterprise/*` (保持, 纳入端3) | 0.5d | G4 |

### Phase 3: 数据隔离加固 (5d, P1)

| 任务 | 工时 | 负责 |
|------|:--:|:--:|
| DAO 层 `withTenant()` 基类 | 1.5d | G6 |
| 端3 全部 DAO 注入 tenant_id 校验 | 2.0d | G6 |
| Redis namespace 拆分(`sys:`/`ops:`/`user:`) | 1.0d | G6 |
| 审计日志表拆分 + 写入路由 | 0.5d | G6 |

### Phase 4: 代理/企业入口 (4d, P1)

| 任务 | 工时 | 负责 |
|------|:--:|:--:|
| 端3 `/agent/*` 代理专属页面 | 1.5d | G4 |
| 端3 `/enterprise/*` 企业页面(迁自现有 enterprise.vue) | 1.0d | G4 |
| 角色切换 UI(顶部 Dropdown) | 1.0d | G4 |
| 端2 代理审核/企业管理功能 | 0.5d | G4 |

### Phase 5: 下线旧 Layout (3d, P2)

| 任务 | 工时 | 负责 |
|------|:--:|:--:|
| 删除 `admin.vue` / `enterprise.vue` / `gateway.vue` / `finance.vue` / `ops.vue` / `agent.vue` / `default.vue` | 1.0d | G4 |
| 全局路由重定向(旧路径 → 新路径 301) | 1.0d | G5 |
| i18n key 迁移 + 清理 | 1.0d | G4 |

---

## 七、总工期与风险

| 阶段 | 工期 | 累计 |
|------|:--:|:--:|
| Phase 1: 权限底座 | 5d | 5d |
| Phase 2: 路由重排 | 8d | 13d |
| Phase 3: 数据隔离 | 5d | 18d |
| Phase 4: 代理/企业入口 | 4d | 22d |
| Phase 5: 下线旧 Layout | 3d | **25d** |

| 风险 | 概率 | 影响 | 缓解 |
|------|:--:|------|------|
| 旧路由 301 遗漏 | 中 | 404 用户中断 | Phase 5 全量 grep 旧路径 + E2E 冒烟 |
| JWT roles 迁移时旧 token 失效 | 低 | 全量用户被迫重新登录 | migration 期间留 15min 双读窗口 |
| 端3 `/enterprise/*` 与 `/agent/*` 路由冲突 | 低 | 企业管理员看不到代理入口 | 路由按 roles 数组渲染，非路径冲突 |
| 运营端与总后台功能边界争议 | 中 | 迭代返工 | 文档 5.6 职责边界清单 提前对齐 |

---

## 八、与现有决策关系

- **Decision 022** (画布策略): 画布暂不开发，与三端架构无关
- **Decision 024** (全链路分阶段): 三端架构的端3(`/enterprise/`)为后期龙虾调度/智能体预留入口
- **RBAC 10角色**: 本次扩展 `portal:*` 权限点，不修改现有角色层级

---

## 九、附录: 当前 Layout → 目标 Layout 迁移清单

| 当前文件 | 行数 | 目标 | 动作 |
|------|:--:|------|------|
| `layouts/admin.vue` | 99 | → `super-admin.vue` + `ops-admin.vue` | 拆分 |
| `layouts/enterprise.vue` | 235 | → 端3 workspace.vue 自适应区 | 合并 |
| `layouts/workspace.vue` | 202 | → 改造为端3 workspace.vue | **改造** |
| `layouts/gateway.vue` | 61 | → 端1 `/sys/gateway/*` 子页 | 合并 |
| `layouts/finance.vue` | 61 | → 端2 `/ops/finance/*` 子页 | 合并 |
| `layouts/ops.vue` | 63 | → 端2 `/ops/campaigns/*` 子页 | 合并 |
| `layouts/agent.vue` | 56 | → 端3 `/agent/*` 子页 | 合并 |
| `layouts/default.vue` | 525 | → 端3 workspace.vue | **合并** |
| `layouts/landing.vue` | 5 | → 不变 | 保留 |

**净减少**: 9 Layouts → 4 Layouts (超级管理员/运营/工作台/落地页)
