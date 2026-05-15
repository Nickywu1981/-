# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Movio AI 电商视觉创作平台 — 最后一次全量审计: 2026-05-15

---

## 启动命令

| 操作 | 命令 |
|------|------|
| 后端开发 | `cd server && npm run dev` |
| 后端启动 | `cd server && npm start` |
| 前端开发 | `cd client && npm run dev` |
| 前端构建 | `cd client && npm run build` |
| Docker 部署 | `docker-compose up -d` |
| 健康检查 | `curl http://localhost:3001/api/health` |

### 测试命令

| 操作 | 命令 |
|------|------|
| 后端测试 | `cd server && npm test` |
| 后端测试(监听) | `cd server && npm run test:watch` |
| 后端测试(覆盖率) | `cd server && npm run test:coverage` |
| 前端测试 | `cd client && npm test` |
| E2E 测试 | `cd client && npm run test:e2e` |
| E2E 测试(UI) | `cd client && npm run test:e2e:ui` |

### 数据库命令

| 操作 | 命令 |
|------|------|
| 执行迁移 | `cd server && npm run db:migrate` |
| 回滚迁移 | `cd server && npm run db:migrate:down` |
| 查看待执行迁移 | `cd server && npm run db:migrate:status` |
| 查看迁移历史 | `cd server && npm run db:migrate:history` |
| 导入种子数据 | `cd server && npm run db:seed` |
| 重置数据库 | `cd server && npm run db:reset` |

### 代码质量

| 操作 | 命令 |
|------|------|
| ESLint 检查 | `cd server && npm run lint` |
| ESLint 修复 | `cd server && npm run lint:fix` |

### 端口分配

| 服务 | 开发 | 生产 |
|------|------|------|
| Nuxt3 前端 | 3000 | Nginx 80 |
| Express 后端 | 3001 | 3001 |
| MySQL | 3306 | 3306 |
| Redis | 6379 | 6379 |
| MinIO | 9000 | 9000 |

---

## 技术栈

- **后端**: Node.js + Express + MySQL 8.0 + Redis + BullMQ + Zod
- **前端**: Nuxt3 + Vue3 + TypeScript + Element Plus + Vant + Pinia + ECharts
- **AI 模型**: OpenAI / Claude / Gemini / Stable Diffusion / DALL-E / Runway / Midjourney（7厂商统一代理）
- **存储**: MinIO 本地对象存储
- **部署**: Docker + Nginx + PM2
- **测试**: Vitest + Supertest + Playwright
- **监控**: Winston 日志 + Prometheus metrics + Swagger API 文档

### 产品定位

服务国内(淘宝/拼多多/抖音/小红书)+跨境(亚马逊/Temu/Shein/TikTok/美客多/Ozon/Shopee/Lazada)13大电商平台。免费试用+会员付费模式，图片+视频全功能闭环。

---

## 架构分层

### 后端分层（6 层）
```
Controller → Service → ModelAdapter → PromptTemplate → OutputFormatter → DAO
```

| 层 | 职责 | 禁止 |
|----|------|------|
| Controller | 参数校验、路由转发、统一响应 `{code,data,msg}` | 禁止写业务逻辑 |
| Service | 核心业务、流程编排、权限校验、用量计算、事务 | 禁止直接调 AI 模型 |
| ModelAdapter | 模型调用、参数转换、错误重试、降级 | 禁止写业务逻辑 |
| PromptTemplate | 提示词管理、参数注入、增强优化 | 禁止硬编码提示词 |
| OutputFormatter | 结果格式化、后处理、质量检查 | 禁止修改原始结果 |
| DAO | 原生 SQL、数据库 CRUD、防 SQL 注入 | 禁止业务逻辑 |

### 前端分层（5 层）
```
Page → Component → Composable/Store → API Layer(useApi.ts) → Middleware
```

### 新增架构组件

| 组件 | 位置 | 职责 |
|------|------|------|
| **AI Gateway Hub** | `server/src/gateway/` | 统一 AI 模型调度、路由注册、健康面板、IP 白名单、关联 ID 追踪 |
| **ADK (Agent Dev Kit)** | `server/src/adk/` | Agent 开发框架：agents/core/orchestration/tools |
| **Workers** | `server/src/workers/` | BullMQ 后台任务消费者 |
| **SDK** | `server/src/sdk/` | 对外 SDK 封装 |

---

## 项目目录结构

```
├── client/                       # Nuxt3 前端 (208 页面)
│   ├── pages/
│   │   ├── work/                 # AI 功能工作台
│   │   ├── admin/                # 管理后台
│   │   ├── account/              # 用户账户
│   │   ├── agent/                # AI Agent 页面
│   │   ├── ai-assistant/         # AI 助手
│   │   ├── gateway/              # Gateway 管理
│   │   ├── ecommerce/            # 电商业务
│   │   ├── enterprise/           # 企业版
│   │   ├── ops/                  # 运营管理
│   │   ├── distribution/         # 分销
│   │   ├── finance/              # 财务
│   │   ├── dashboard/            # 数据看板
│   │   ├── auth/                 # 认证
│   │   ├── payment/              # 支付
│   │   ├── member/               # 会员
│   │   ├── diy/                  # DIY 编辑器
│   │   ├── assets/               # 素材库
│   │   └── legal/                # 法律页面
│   ├── components/               # 通用组件
│   ├── composables/              # 组合式函数 (28个)
│   ├── stores/                   # Pinia 状态管理 (auth/settings/ui)
│   └── assets/css/               # 全局样式+CSS 变量主题
├── server/                       # Express 后端
│   └── src/
│       ├── controller/           # 92 个控制器
│       ├── services/             # 155 业务服务 + adapters/
│       ├── dao/                  # 69 个 DAO
│       ├── route/                # 93 条路由 (90/93 Zod 文件覆盖, 447/697 端点)
│       ├── middleware/           # 17 个中间件
│       ├── gateway/              # AI Gateway Hub
│       ├── adk/                  # Agent Development Kit
│       ├── workers/              # 后台任务 Worker
│       ├── sdk/                  # 对外 SDK
│       ├── utils/                # 工具函数 (19个)
│       ├── constants/            # 错误码 + 枚举
│       ├── config/               # 配置文件
│       └── __tests__/            # 测试 (按模块分目录)
├── scripts/                      # 运维脚本 (10个)
├── e2e/                          # Playwright E2E 测试 (16个: 13根 + 3 client)
├── docs/                         # 项目文档 (4大类 + kb + archive)
├── docker/                       # Docker 部署配置
└── decisions/                    # 架构决策记录
```

---

## 统一响应格式（不可变更）

```js
// 成功
{ code: 200, msg: "success", data: {...} }
// 分页
{ code: 200, msg: "success", data: { list: [...], total, page, pageSize } }
// 错误
{ code: 400/401/403/404/500, msg: "错误信息", data: null }
// 异步任务
{ code: 202, msg: "processing", data: { taskId: "xxx" } }
```

---

## 错误码体系

格式: `EC_{模块}_{序号}`，定义在 `server/src/constants/errorCode.js`

| 前缀 | 模块 | 范围 |
|------|------|------|
| `EC_SYS_` | 系统通用 | 0001-0099 |
| `EC_AUTH_` | 认证/授权 | 0100-0199 |
| `EC_USR_` | 用户 | 0200-0299 |
| `EC_GEN_` | 生成引擎 | 0300-0399 |
| `EC_PROMPT_` | 提示词 | 0400-0499 |
| `EC_MODEL_` | AI 模型 | 0500-0599 |
| `EC_ASSET_` | 素材管理 | 0600-0699 |
| `EC_BILL_` | 计费 | 0700-0799 |
| `EC_FILE_` | 文件/上传 | 1000-1099 |
| `EC_RATE_` | 限流 | 1500-1599 |
| `EC_VALID_` | 参数校验 | 1600-1699 |
| `EC_THIRD_` | 第三方服务 | 3000-3099 |

使用: `res.json(fail('EC_AUTH_0001', 'Token 已过期'))` — 禁止裸 HTTP 状态码。

---

## 数据库规范

### 必含基础字段
```sql
id INT PRIMARY KEY AUTO_INCREMENT
create_time DATETIME DEFAULT CURRENT_TIMESTAMP
update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
is_deleted TINYINT DEFAULT 0
```

### 命名规范
- 表名: 小写+下划线 (`user_projects`)，索引: `idx_表名_字段名`
- 金额: `DECIMAL(10,2)`，状态: `TINYINT`
- 软删除: 所有删除用 `is_deleted`，禁止物理 DELETE

### Redis 缓存
- Key 格式: `movio:{模块}:{标识}`
- 更新规则: 写操作后主动清除对应缓存

---

## 安全要求（红线）

- SQL 必须参数化（`mysql2/promise`），禁止字符串拼接
- API Key AES-256 加密存储，日志禁止打印
- 提示词注入防护 + 内容安全审核
- 文件上传: 类型白名单 + MIME 检测 + 大小限制
- JWT 鉴权 + RBAC + rate-limit + Helmet + CSP
- 前端禁止直接调用 AI 模型

---

## API 校验链

```
1. middleware/validate.js (Zod schema 校验)
2. controller 参数级校验
3. service 业务规则校验
```

---

## Git 规范

### 提交格式
```
type(scope): subject
```
type: `feat`/`fix`/`docs`/`style`/`refactor`/`perf`/`test`/`build`/`ci`/`chore`/`revert`

### 分支模型
```
main (生产)
  ├── develop (开发主线)
  │     ├── feat/{模块}-{简述}
  │     ├── fix/{模块}-{简述}
  │     └── refactor/{模块}-{简述}
  └── hotfix/{日期}-{简述}
```
- `main`/`develop` 保护分支，禁止直接提交
- PR 合并默认 Squash and merge

---

## 环境变量速查

| 变量 | 必填 | 说明 |
|------|------|------|
| `PORT` | ✅ | 后端端口 |
| `DB_HOST/USER/PASSWORD/NAME` | ✅ | 数据库连接 |
| `REDIS_URL` | ✅ | Redis 连接 |
| `JWT_SECRET` | ✅ | JWT 签名密钥 |
| `OPENAI_API_KEY` | — | OpenAI API Key |
| `CLAUDE_API_KEY` | — | Claude API Key |
| `MINIO_ACCESS_KEY/SECRET_KEY` | ✅ | 对象存储凭证 |

---

## 访问地址

- 首页: `http://localhost:3000`
- 登录: `http://localhost:3000/login` (`demo`/`demo123` 或 `admin`/`admin123`)
- 工作台: `http://localhost:3000/workspace`
- 管理后台: `http://localhost:3000/admin/dashboard`
- API 文档: `http://localhost:3001/api-docs`

---

## 当前项目状态

- **212 个前端页面**全部 200 OK
- **93 条路由** (697 端点: 310 GET / 290 POST / 53 PUT / 42 DELETE / 2 PATCH)
- **92 个控制器**零内联 SQL, 83/92 使用 wrapController 统一兜底
- **Zod 文件覆盖 90/93** (96.8%), 端点覆盖 447/697 (64.1%)
- **155 个 Service** (2 待清理), **69 个 DAO**, **17 个中间件**
- **数据库 124 表**, 33 迁移文件
- **116 测试文件**: 后端 97 / 前端 3 / E2E 16
- **i18n**: zh-CN + en-US (116 key), UI 硬编码中文已清零
- **三端架构已落地**: platform-admin(53页) / business-ops(12页) / user-workspace(145页)
- 品牌色: `#5b5fe3`（暖靛蓝），CSS 变量 100% 覆盖

---

## 关键待办

1. 接入真实 AI API Key（OpenAI/Claude）
2. 接入真实支付商户（微信/支付宝）
3. 全站 i18n 页面翻译
4. 客户端 Vitest 可运行（需解决中文路径问题）

---

## 代码审查清单

### 安全（最高优先级）
- [ ] 无硬编码 API Key/密钥
- [ ] SQL 参数化，无字符串拼接
- [ ] 用户输入经清洗过滤
- [ ] 文件上传有类型+大小检查
- [ ] 敏感数据脱敏

### 代码质量
- [ ] 前端无业务逻辑、无 AI 调用
- [ ] 提示词在模板文件中，非代码内硬编码
- [ ] Zod schema 校验完整
- [ ] 异常捕获完整（asyncHandler 包裹）
- [ ] 统一响应格式 `{code, data, msg}`
- [ ] 软删除（is_deleted），非物理 DELETE
- [ ] v-for 有 `:key`
- [ ] 无未使用 import

### 性能
- [ ] 无 N+1 查询
- [ ] 列表有分页
- [ ] 热点数据有缓存
- [ ] AI 调用有超时+重试+降级

---

## MinIO 存储规范

| 桶名 | 用途 | 权限 | 过期策略 |
|------|------|------|---------|
| `movio-uploads` | 用户上传 | 公开读 | 无过期 |
| `movio-generations` | AI 生成素材 | 公开读 | 无过期 |
| `movio-exports` | 导出文件 | 预签名 URL 7天 | 7 天后删除 |
| `movio-backups` | 数据库备份 | 私密 | 30 天保留 |

---

## 部署

### 蓝绿部署
```
启动新版本(3002) → 健康检查 → Nginx 切流量 → 旧版保留 5min → 下线
异常时 → Nginx 切回 3001
```

### PM2
- `ecosystem.config.cjs` — 集群模式，movio-api + movio-nuxt
- 512M 内存重启阈值

### Docker
- `docker-compose.yml` — MySQL 8.4 + Redis + MinIO + Server + Client

---

## 规则自动维护

AI 必须在以下情况自动更新 CLAUDE.md 中的数字，不等用户提醒:
- 新增/删除页面 → 更新页面总数
- 新增/删除路由 → 更新路由总数 + Zod 覆盖率
- 测试数量变化 → 更新测试描述
- 每次修复 bug → 更新防反复出错表

关键 grep:
```bash
find client/pages -name "*.vue" | wc -l          # 页面数
ls server/src/route/*.js | wc -l                  # 路由文件数
grep -l "validate(" server/src/route/*.js | wc -l # Zod 覆盖数
```

---

## Agent 团队结构

### G1 架构规划组

| Agent | 配置 | 职责 | 红线 |
|-------|------|------|------|
| **Architect** | `.claude/agents/architect.md` | 架构评审、技术选型、规范制定、代码审查 | 不写业务代码、不干预其他组 |
| **Security-Auditor** | `.claude/agents/security-auditor.md` | 安全漏洞审计、敏感数据保护、基础设施安全、AI安全、合规检查 | 不写业务代码、不修复漏洞、不干预其他组 |

**调用方式**: `@Architect` / `@Security-Auditor`

**G1 组规**:
1. 只负责架构、技术选型、规范、代码审查、安全审计
2. 禁止编写业务代码
3. 禁止干预其他组的职责范围
4. 发现问题 → 报告问题，由对应开发组修复
