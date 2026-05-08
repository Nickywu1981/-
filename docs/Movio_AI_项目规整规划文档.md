# Movio AI 电商 AI 助手 SaaS — 项目全面规整规划文档

> **版本**: 2.0  
> **日期**: 2026-05-08  
> **状态**: 聚焦版 — 图片 + 视频 + 文案 + DIY 页面编辑器  
> **策略**: 先做真、做精、做到能卖钱，再扩展

---

## 目录

1. [项目整体定位、业务范围、核心功能总清单](#1-项目定位与业务范围)
2. [最终技术架构、分层标准、开发规范](#2-技术架构与分层标准)
3. [前后端标准目录结构](#3-前后端标准目录结构)
4. [当前已开发进度盘点](#4-当前开发进度盘点)
5. [缺失模块/接口/配置/需重构优化](#5-缺失与待重构清单)
6. [后续新增功能/模块/接口清单](#6-后续新增规划)
7. [多 AI Agent 分工体系](#7-ai-agent-团队分工体系)
8. [分阶段有序开发计划表](#8-分阶段开发计划)

---

## 1. 项目定位与业务范围

### 1.1 项目定位

**Movio AI** 是面向电商商家的 AI 视觉+文案创作 SaaS 平台。基于第三方多模型接入架构（不自研模型），聚焦图片生成、视频制作、文案生成、DIY 页面搭建四大核心能力。

| 维度 | 定义 |
|------|------|
| 产品类型 | 电商 AI 素材生成 SaaS 系统 |
| 目标用户 | 电商卖家、代运营人员、自媒体带货 |
| 覆盖终端 | PC 管理后台 + H5 移动端 + PWA |
| 商业模式 | 免费试用 + 会员订阅 + 按量计费 |
| 核心竞争力 | AI 图片+视频+文案全链路 + 拖拽编辑器零代码搭页面 + 13 平台适配 |

### 1.2 业务范围

- **AI 图片处理**: 智能抠图、白底图、场景生成、电商主图生成、13 平台尺寸适配、批量处理、图片对比/AB测试
- **AI 视频制作**: 图片转短视频、商品展示视频、配乐+字幕自动合成
- **AI 文案生成**: 商品标题生成（多平台规则适配）、卖点文案、跨境翻译+本地化润色、短视频脚本生成（抖音/视频号/TikTok）
- **DIY 页面系统**: 拖拽可视化编辑器（零代码）、行业模板库（≥20个）、页面状态机+版本管理、PC/移动端双端配置、运营人员权限分离
- **批量处理引擎**: 批量抠图/场景/尺寸，异步队列 + WebSocket 实时进度
- **素材管理**: 上传/分类/标签/搜索/收藏，MinIO 对象存储
- **提示词增强**: 100+ 电商预设模板、收藏+自定义分组、变量自动解析、智能推荐
- **用户系统**: 注册/登录/JWT 双 Token/角色权限
- **订阅支付**: 套餐/订单/计费
- **管理后台**: 用户管理、内容审核、数据统计、系统配置

### 1.3 核心功能模块清单（聚焦版）

| 编号 | 功能模块 | 核心能力 | 状态 |
|:--:|------|------|:--:|
| M1 | AI 图片生成 | 抠图、白底图、场景生成、电商主图 | ✅ |
| M2 | AI 图片增强 | 13 平台尺寸适配、批量处理、图片对比/AB测试 | 🟡 |
| M3 | AI 视频制作 | 图片转视频、商品展示视频、配乐+字幕 | ✅ |
| M4 | AI 文案生成 | 标题生成（多平台规则）、卖点文案、跨境翻译+本地化 | 🟡 |
| M5 | 短视频脚本 | 抖音/视频号/TikTok 差异化脚本结构 | 🟡 |
| M6 | DIY 页面管理 | 状态机+双端配置+版本管理+访问统计+权限分离 | 🔴 |
| M7 | 拖拽编辑器 | 组件库+画布+图层+属性面板+自动保存+操作引导 | 🔴 |
| M8 | 批量处理引擎 | 批量队列 + WebSocket 进度 | ✅ |
| M9 | 素材管理 | 上传/分类/标签/搜索/收藏 | ✅ |
| M10 | 用户系统 | 注册/登录/JWT 双 Token/角色权限 | ✅ |
| M11 | 订阅支付 | 套餐/订单/计费 | ✅ |
| M12 | 管理后台 | 30 页面全 CRUD | ✅ |
| M13 | 提示词增强 | 100+模板库+收藏+分组+变量解析+推荐 | 🟡 |
| M14 | AI 调用增强 | 主备模型切换+Token统计+中断恢复 | 🟡 |

> 🔴 = 待开发 | 🟡 = 部分完成需补全 | ✅ = 已完成

---

## 2. 技术架构与分层标准

### 2.1 最终技术栈（永久锁定）

| 层 | 技术 | 版本 | 说明 |
|------|------|------|------|
| **前端框架** | Nuxt3 + Vue3.4 + TypeScript | 3.x | SSR + 响应式 + 移动端优先 |
| **UI 组件库** | Element Plus + Vant UI | latest | PC/H5 双端适配 |
| **状态管理** | Pinia | 2.x | 全局状态 + localStorage 持久化 |
| **后端框架** | Express + Node.js | 4.x / 20 LTS | 模块化路由 |
| **类型校验** | Zod | 3.x | 前后端统一参数校验 |
| **数据库** | MySQL 8.4 | InnoDB | utf8mb4 + 逻辑删除 |
| **缓存** | Redis 7 | — | 会话 + 缓存 + 队列 + 黑名单 |
| **对象存储** | MinIO | latest | S3 兼容 + 预签名 URL |
| **消息队列** | BullMQ | 5.x | 图片/视频/批量/通知 4 队列 |
| **实时推送** | WebSocket (ws) | 8.x | 任务进度实时推送 |
| **进程管理** | PM2 | 5.x | Cluster 模式 + 自动重启 |
| **反向代理** | Nginx | 1.25+ | HTTPS/HTTP2/Brotli/WS 升级 |
| **容器化** | Docker Compose | v3 | 5 服务一键启动 |
| **CI/CD** | GitHub Actions | — | 构建→测试→部署 5 job |
| **日志** | Winston | 3.x | 分级日志 + 文件轮转 |
| **测试** | Vitest + Playwright | latest | 单元 + E2E |
| **文档** | Swagger | 5.x | OpenAPI 自动生成 |

### 2.2 10 层架构（自上而下固定）

```
① 用户接入层        PC管理后台 / H5移动端 / PWA / 开放API客户端
② Nginx 反向代理层   :80/:443 — HTTPS/TLS1.3/HTTP2/Brotli/IP黑白名单/防爬
③ Nuxt3 前端应用层    :3000 — SSR/Pinia/i18n/暗黑/CSP/CSRF
④ 安全认证中间件层    JWT双Token/RBAC/RateLimit/CSRF/CORS/参数过滤器
⑤ Express 业务服务层  :3001 — Controller→Service→DAO 三层分离
⑥ 异步任务+WebSocket  BullMQ 4队列 + WS 实时进度 + 重试/超时/持久化
⑦ DAO 统一数据访问层  tenantPool多租户/参数化查询/软删除
⑧ Redis 缓存层       JWT黑名单/限流/会话/队列/数据缓存
⑨ 数据库与对象存储层   MySQL 8.4 + MinIO S3
⑩ DevOps 运维监控层   Docker/PM2/Prometheus/Grafana/CI/CD/Winston
```

### 2.3 前后端分离铁律

| 规则 | 内容 |
|------|------|
| 代码隔离 | 前端 `client/`、后端 `server/` 完全独立，各自 package.json |
| 通信方式 | 前端通过 `:3001/api/*` 调用后端，Nginx 反向代理 |
| 类型契约 | 前端 interface 对应后端 Zod schema |
| 错误码统一 | `EC_{模块}_{序号}` 格式，前端全局拦截 |
| 禁止行为 | 前端不直连数据库、后端不写 HTML、禁止跨层调用 |

### 2.4 开发规范（强制）

| 类别 | 规范 |
|------|------|
| **命名** | 文件: kebab-case, 变量: camelCase, 类: PascalCase, 常量: UPPER_SNAKE |
| **模块系统** | ES6 import/export 统一，禁止 CommonJS require |
| **TypeScript** | Strict 模式，禁止 `any` 无理由使用 |
| **参数校验** | 所有入参 Zod schema 校验，无例外 |
| **安全** | 参数化 SQL、JWT 鉴权、CORS 白名单、文件类型/大小校验 |
| **API 格式** | 统一 `{ code, message, data }` 响应 |
| **数据库** | InnoDB/utf8mb4/软删除/时间戳/索引优化 |
| **测试** | 关键 Service 必测，Controller 可选，DAO mock |
| **Git** | 每功能独立提交，Conventional Commits 格式 |

---

## 3. 前后端标准目录结构

### 3.1 项目根目录

```
Movio AI/
├── CLAUDE.md                          # AI 协作规则（824行/19章）
├── README.md                          # 项目说明
├── CHANGELOG.md                       # 版本记录
├── docker-compose.yml                 # Docker 5 服务编排
├── nginx.conf                         # Nginx 配置
├── .env / .env.example                # 环境变量
├── .gitignore / .prettierrc           # 基础配置
├── package.json                       # 根 workspace
│
├── client/                            # === 前端（Nuxt3）===
│   ├── nuxt.config.ts                 # Nuxt 配置（PWA/CSP/i18n）
│   ├── i18n.config.ts                 # 国际化配置
│   ├── tsconfig.json                  # TS Strict 配置
│   ├── package.json
│   ├── app.vue                        # 应用入口
│   ├── pages/                         # 页面（113个）
│   │   ├── index.vue                  # 首页/落地页
│   │   ├── login.vue                  # 登录
│   │   ├── register.vue               # 注册
│   │   ├── workspace.vue              # 工作台（核心）
│   │   ├── compare.vue                # 竞品对比
│   │   ├── help.vue                   # 帮助中心
│   │   ├── work/                      # 工作区（27个）
│   │   ├── admin/                     # 管理后台（30个）
│   │   ├── my/                        # 个人中心（5个）
│   │   └── account/                   # 账户（2个）
│   ├── components/                    # 组件（16个）
│   │   ├── shared/                    # 通用组件
│   │   ├── onboarding/                # 新手引导
│   │   └── admin/                     # 管理后台组件
│   ├── composables/                   # 组合函数（15个）
│   ├── stores/                        # Pinia 状态（3个）
│   ├── layouts/                       # 布局（2个）
│   ├── middleware/                     # 前端中间件
│   ├── plugins/                       # 插件
│   ├── public/                        # 静态资源
│   ├── assets/                        # 样式/图片
│   └── utils/                         # 工具函数
│
├── server/                            # === 后端（Express）===
│   ├── package.json
│   ├── ecosystem.config.js            # PM2 集群配置
│   ├── grafana-dashboard.json         # 监控仪表盘
│   ├── src/
│   │   ├── index.js                   # 服务入口
│   │   ├── app.js                     # Express 应用配置
│   │   ├── config/                    # 配置层
│   │   │   ├── index.js               # 多环境配置
│   │   │   ├── db.js                  # MySQL 连接池
│   │   │   ├── jwt.js                 # JWT 配置
│   │   │   └── redis.js               # Redis 客户端
│   │   ├── controller/                # 控制器（38个）
│   │   ├── service/                   # 服务层（41个）
│   │   ├── dao/                       # 数据访问（25个）
│   │   ├── route/                     # 路由（36个）
│   │   ├── middleware/                # 中间件（12个）
│   │   ├── utils/                     # 工具函数
│   │   ├── adapters/                  # AI 模型适配器
│   │   └── __tests__/                 # 测试（23文件）
│   ├── sql/
│   │   ├── schema.sql                 # 建表（33表）
│   │   ├── seed_phase1.sql            # 种子数据
│   │   └── migrations/                # 迁移脚本
│   └── scripts/
│       └── audit-rules.js             # 规则自动审计
│
└── docs/                              # 文档
    └── Movio_AI_项目规整规划文档.md     # 本文档
```

### 3.2 目录规范铁律

| 规则 | 内容 |
|------|------|
| Controller | 只做参数提取+调用 Service+响应返回，无业务逻辑 |
| Service | 所有业务逻辑在此，调用 DAO，禁止直接操作 req/res |
| DAO | 只做数据库查询，参数化 SQL，禁止业务判断 |
| Route | 只定义路径+方法+中间件链+Zod schema |
| Middleware | 独立功能单文件，禁止包含业务逻辑 |
| 文件组织 | 一功能一文件，禁止巨型文件 |

---

## 4. 当前开发进度盘点

### 4.1 总体统计

| 指标 | 数量 | 状态 |
|------|:--:|:--:|
| **前端页面** | 113 个 `.vue` | ✅ |
| **前端组件** | 16 个 | ✅ |
| **前端 Composable** | 15 个 | ✅ |
| **Pinia Store** | 3 个 | ✅ |
| **后端控制器** | 38 个 | ✅ |
| **后端服务** | 41 个 | ✅ |
| **后端 DAO** | 25 个 | ✅ |
| **后端路由** | 36 条 | ✅ |
| **后端中间件** | 12 个 | ✅ |
| **数据库表** | 33 张 | ✅ |
| **测试文件** | 23 个（Server）| ✅ |
| **CLAUDE.md** | 824 行 / 19 章 | ✅ |
| **Memory 文件** | 19 个 | ✅ |

### 4.2 已完成模块详情

| 模块 | 涉及文件 | 说明 |
|------|------|------|
| **用户系统** | userController/Service/DAO/Routes, auth.js, jwtToken.js, rbac.js | 注册/登录/双 Token/黑名单/角色权限 |
| **AI 图片** | imageController/Service, advancedImageService | 14 种 AI 图片处理 |
| **AI 视频** | videoController/Service, advancedVideoService | 9 种 AI 视频能力 |
| **批量引擎** | batchController/Service/DAO, queueManager.js | 异步队列 + WS 进度 |
| **支付订阅** | commerceController/Service/DAO, paymentService | 套餐/订单/计费 |
| **素材管理** | uploadController/Service, storageService | MinIO S3 存储 |
| **短信/邮件** | smsService, emailService | 验证码发送 |
| **营销工具** | badgeController/Service/DAO | 营销角标 |
| **会员分级** | tierController/Service/DAO | 三级会员 |
| **开放 API** | openApiRoutes | API Key 鉴权 |
| **管理后台** | admin/ 下 30 个页面 | 全功能 CRUD |
| **安全层** | auth/rbac/csrf/rateLimiter/inputFilter/cors | 6 层防护 |
| **缓存层** | cache.js + Redis | 6 路由接入缓存 |
| **监控** | metrics.js + Grafana | Prometheus 指标 |
| **CI/CD** | .github/workflows/ci.yml | 5 job 流水线 |
| **部署** | Docker/PM2/Nginx | 一键启动 |

### 4.3 已封装框架/工具

| 框架/工具 | 文件 | 功能 |
|------|------|------|
| 统一响应 | `utils/response.js` | `{ code, message, data }` |
| 统一错误码 | `utils/errorCode.js` | EC_{模块}_{序号} |
| 分页工具 | `utils/pagination.js` | 自动分页封装 |
| JWT 双 Token | `utils/jwtToken.js` | access+refresh+黑名单 |
| 多租户池 | `dao/tenantPool.js` | tenant_id 自动注入 |
| 异步异常 | `middleware/asyncHandler.js` | async 错误捕获 |
| API 限流 | `middleware/rateLimiter.js` | express-rate-limit |
| CSRF 防护 | `middleware/csrf.js` | CSRF Token |
| 输入过滤 | `middleware/inputFilter.js` | 特殊字符拦截 |
| 日志系统 | `utils/logger.js` | Winston 分级 |
| 模型适配 | `adapters/*Adapter.js` | 多 AI 模型路由 |
| 提示词库 | `services/promptTemplates.js` | 38 个模板 |
| API 管理层 | `composables/useApi.ts` | 前端 $fetch 封装 |

---

## 5. 缺失与待重构清单

### 5.1 🔴 P0 — 严重（4 项）

| # | 问题 | 影响 | 建议 |
|---|------|------|------|
| 1 | **25 个 DAO 绕过 tenantPool** | 多租户数据未隔离 | 全部 DAO 改为 `import tenantPool` |
| 2 | **adminAuth.js 绕过 JWT 黑名单** | 吊销 token 仍可访问管理后台 | adminAuth 接入 `isTokenBlacklisted` |
| 3 | **RBAC 完全死代码** | rbac.js 已写，0 条路由使用 | 关键路由接入 `requireRole/requirePermission` |
| 4 | **8 个 Service 跳过 DAO 直写 SQL** | 破坏分层架构 | logService/aiLogService/badgeService 等迁移到 DAO |

### 5.2 🟠 P1 — 高优先级（9 项）

| # | 问题 |
|---|------|
| 5 | 8 个测试失败（vitest mock 未配置），非真实 108 全通过 |
| 6 | CLAUDE.md §15 数据过期（虚报 32 路由/35 控制器，实际 36/38） |
| 7 | openApiRoutes.js 4 个 POST 端点零 Zod 校验 |
| 8 | index.vue + workspace.vue 硬编码 `localhost:3001` |
| 9 | 13 个 admin 页面是空壳（ai-models/analytics/brand-settings/collection/diy-pages/email-templates/templates/tier/settings 等） |
| 10 | 113 页面用裸 `$fetch`，无统一 API 层 |
| 11 | emailService.js 验证码存内存 Map，重启丢失 |
| 12 | commerceService.js LIMIT 拼接 + 空结果崩溃 |
| 13 | allinpayService.js type 字段用字符串非整数 |

### 5.3 🟡 P2 — 中优先级（14 项）

| # | 问题 |
|---|------|
| 14 | 6 个 Controller 无 try-catch（abuse/analytics/badge/collection/multilingual/platformDetail） |
| 15 | 22/41 Service 无 try-catch，错误静默吞没 |
| 16 | 3 个 AI Adapter 无 try-catch |
| 17 | imageService.js completeTask 参数契约不一致 |
| 18 | promptService.js JSON.parse 无 try-catch |
| 19 | queueManager.js Redis 默认值三处重复 |
| 20 | storageService.js 默认 S3 凭证硬编码 |
| 21 | 6 个组件缺 `defineEmits` |
| 22 | 4 个组件硬编码颜色非 CSS 变量 |
| 23 | default.vue 180 行内联搜索索引 |
| 24 | toast.ts 与 useToast.ts 功能重复 |
| 25 | Helmet 默认配置无自定义 CSP |
| 26 | uploadLimiter 已导出但从未使用 |
| 27 | .env.example 不完整 |

### 5.4 🟢 P3 — 可增强（5 项）

| # | 问题 |
|---|------|
| 28 | 全站 i18n 翻译（框架就绪，$t() 零使用） |
| 29 | i18n.config.ts 中/英双语词条不完整 |
| 30 | 客户端 Vitest 因中文路径不可用 |
| 31 | WebSocket worker 数为硬编码 |
| 32 | Prometheus metrics 埋点不完整 |

---

## 6. 后续新增规划

### 6.1 待新增功能模块（8 项，聚焦版）

| 编号 | 功能 | 描述 | 优先级 | 预估人天 |
|:--:|------|------|:--:|:--:|
| N1 | **13 平台尺寸配置化** | 13 平台主图+详情图尺寸规范存储+一键适配输出+格式自动校验 | 🔴 | 2d |
| N2 | **商品标题+卖点文案** | 多平台规则适配标题生成+结构化卖点文案+AI 链式生成 | 🔴 | 3d |
| N3 | **跨境翻译+本地化** | 9 语种电商话术本地化（非直译，文化适配+口语化） | 🔴 | 3d |
| N4 | **短视频脚本生成** | 抖音/视频号/TikTok 三平台差异化脚本结构+口播台词+镜头提示 | 🔴 | 3d |
| N5 | **图片对比/AB测试** | 原图vs生成图并排/滑动/叠图三种模式+多风格网格排列 | 🟡 | 1.5d |
| N6 | **提示词增强体系** | 100+电商预设模板+收藏+自定义分组+官方分组+{{变量}}自动解析+智能推荐 | 🟡 | 5d |
| N7 | **DIY 页面管理系统** | 模板库(≥20个行业模板)+状态机（草稿→审核→发布→下线→回收站）+PC/移动双端配置+版本管理+30秒自动快照+差异对比回滚+访问统计+编辑/发布权限分离 | 🔴 | 4d |
| N8 | **拖拽可视化编辑器** | 画布（网格/标尺/磁吸）+组件拖拽松手即到位+电商组件库（商品卡片/价格/SKU/优惠券）+基础组件库+表单式属性面板（非JSON）+样式可视化配置+图层树+撤销/重做+自动保存+移动端预览+首次操作引导 | 🔴 | 6d |
| N9 | **AI 调用增强** | 主/备用模型自动切换+Token消耗/耗时/成本统计+生成中断恢复续跑 | 🟡 | 2d |

### 6.2 待新增接口（20 项，聚焦版）

| 编号 | 接口 | 方法 | 路由 | 优先级 |
|:--:|------|:--:|------|:--:|
| A1 | 平台尺寸列表 | GET | `/api/platform-specs` | 🔴 |
| A2 | 平台规格 CRUD | CRUD | `/api/admin/platform-specs` | 🔴 |
| A3 | 一键适配输出 | POST | `/api/images/adapt-size` | 🔴 |
| A4 | 生成标题 | POST | `/api/copy/title` | 🔴 |
| A5 | 生成卖点文案 | POST | `/api/copy/selling-points` | 🔴 |
| A6 | 跨境翻译+本地化 | POST | `/api/copy/translate-localize` | 🔴 |
| A7 | 生成短视频脚本 | POST | `/api/copy/video-script` | 🔴 |
| A8 | 提示词收藏/取消 | POST | `/api/prompts/:id/favorite` | 🟡 |
| A9 | 批量收藏管理 | POST | `/api/prompts/batch-favorite` | 🟡 |
| A10 | 提示词分组 CRUD | CRUD | `/api/prompt-groups` | 🟡 |
| A11 | 官方分组管理 | CRUD | `/api/admin/prompt-groups` | 🟡 |
| A12 | 提示词使用记录 | GET | `/api/prompts/history` | 🟡 |
| A13 | DIY页面 CRUD | CRUD | `/api/diy/pages` | 🔴 |
| A14 | 页面提交审核 | POST | `/api/diy/pages/:id/submit` | 🔴 |
| A15 | 页面审核回调 | PUT | `/api/admin/diy/pages/:id/review` | 🔴 |
| A16 | 页面发布/下线 | POST | `/api/diy/pages/:id/publish` | 🔴 |
| A17 | 页面版本列表 | GET | `/api/diy/pages/:id/versions` | 🔴 |
| A18 | 版本对比详情 | GET | `/api/diy/pages/:id/versions/:vid/diff` | 🔴 |
| A19 | 版本回滚/同步 | POST | `/api/diy/pages/:id/versions/:vid/rollback` | 🔴 |
| A20 | DIY模板库 | GET | `/api/diy/templates` | 🔴 |
| A21 | 编辑器组件库 | GET | `/api/diy/components` | 🔴 |
| A22 | 组件样式 CRUD | CRUD | `/api/diy/component-styles` | 🔴 |
| A23 | 页面访问统计 | GET | `/api/diy/pages/:id/stats` | 🟡 |
| A24 | AI调用统计 | GET | `/api/ai/stats` | 🟡 |

### 6.3 待新增配置（4 项）

| 编号 | 配置项 | 说明 | 优先级 |
|:--:|------|------|:--:|
| C1 | `.env.production` | 生产环境独立配置 | 🔴 |
| C2 | `Redis 持久化` | RDB+AOF 双写配置 | 🔴 |
| C3 | `平台尺寸规范 JSON` | 13 平台主图/详情图/视频尺寸/格式/大小限制 | 🔴 |
| C4 | `AI模型备用列表` | 主/备模型映射表+故障切换阈值 | 🟡 |

---

## 7. AI Agent 团队分工体系

### 7.1 团队总览（13 人）

| 编号 | 角色名称 | 代号 | 核心职责 | 技术栈 |
|:--:|------|------|------|------|
| 1 | **产品经理** | `Product-Manager` | 需求分析、用户故事、功能优先级、竞品调研、埋点设计、验收标准 | 产品方法论 |
| 2 | **项目总指挥** | `Orchestrator` | 统筹协调、任务分配、进度管理、五维质量验收 | 全栈视野 |
| 3 | **架构师** | `Architect` | 技术选型、分层规范、代码审查、规则维护 | 架构设计 |
| 4 | **后端开发 A** | `Backend-A` | Controller + Route + Middleware | Express/Zod |
| 5 | **后端开发 B** | `Backend-B` | Service + DAO + 数据库操作 | MySQL/Redis |
| 6 | **前端开发 A** | `Frontend-A` | 页面开发（pages/） | Nuxt3/Vue3 |
| 7 | **前端开发 B** | `Frontend-B` | Composables + Stores + Components + 基础设施 | TS/Pinia |
| 8 | **UI 设计师** | `UI-Designer` | CSS 变量、主题、暗黑模式、响应式、动效 | CSS/Tailwind |
| 9 | **测试工程师** | `QA-Engineer` | Vitest 单元 + Playwright E2E + 接口测试 | Vitest/Playwright |
| 10 | **DevOps 工程师** | `DevOps` | Docker/PM2/CI/CD/Nginx/MinIO/BullMQ | Docker/Linux |
| 11 | **安全审计师** | `Security-Auditor` | Zod/CSRF/CSP/SQL 注入/XSS/JWT/RBAC | 安全框架 |
| 12 | **文档工程师** | `Doc-Writer` | README/API/Swagger/架构图/CHANGELOG | Markdown |
| 13 | **规则维护师** | `Rules-Keeper` | CLAUDE.md 同步、Memory 更新、audit-rules 触发 | 规则管理 |

### 7.2 各角色详细职责

#### 1. 产品经理 `Product-Manager`

| 维度 | 内容 |
|------|------|
| **能做** | 接收原始需求→转译成用户故事+验收标准+原型草图→输出 PRD→排功能优先级→定义埋点事件→竞品分析→用户画像维护 |
| **不能做** | 写代码、改架构、新增技术依赖、操作数据库、代 UI 设计师输出设计稿 |
| **产出物** | PRD 文档、用户故事地图、功能优先级矩阵、验收标准清单、竞品分析报告、埋点事件表 |

#### 2. 项目总指挥 `Orchestrator`

| 维度 | 内容 |
|------|------|
| **能做** | 接收用户需求→拆分任务→分派给各 Agent→监控进度→五维质量验收→汇报结果 |
| **不能做** | 写业务代码、改架构、新增依赖、直接操作数据库 |
| **产出物** | 任务拆分清单、进度报告、验收报告 |

#### 3. 架构师 `Architect`

| 维度 | 内容 |
|------|------|
| **能做** | 制定技术方案、审核新增依赖、Code Review、维护 10 层架构标准、更新 CLAUDE.md 架构章节 |
| **不能做** | 写业务代码、直接改前端 UI、操作数据库 |
| **产出物** | 架构决策记录、技术方案文档、Code Review 意见 |

#### 4. 后端开发 A `Backend-A`

| 维度 | 内容 |
|------|------|
| **能做** | 开发 Controller/Route/Middleware、接入 Zod 校验、定义 API 契约 |
| **不能做** | 写 Service 逻辑、直接操作 DAO/数据库、改前端代码 |
| **产出物** | Controller 文件、Route 文件、Middleware 文件 |

#### 5. 后端开发 B `Backend-B`

| 维度 | 内容 |
|------|------|
| **能做** | 开发 Service 业务逻辑、DAO 数据操作、数据库查询优化、SQL 迁移脚本 |
| **不能做** | 写 Controller/Route、定义 HTTP 接口、改前端代码 |
| **产出物** | Service 文件、DAO 文件、SQL 迁移文件 |

#### 6. 前端开发 A `Frontend-A`

| 维度 | 内容 |
|------|------|
| **能做** | 开发 Vue 页面、对接后端 API、实现交互逻辑 |
| **不能做** | 写 Composable/Store/基础设施、改后端接口 |
| **产出物** | `.vue` 页面文件 |

#### 7. 前端开发 B `Frontend-B`

| 维度 | 内容 |
|------|------|
| **能做** | 开发 Composable/Store/Layout/Component/Plugin、封装 API 管理层 |
| **不能做** | 开发业务页面、改后端接口 |
| **产出物** | `.ts` composable/store 文件、`.vue` 组件/layout 文件 |

#### 8. UI 设计师 `UI-Designer`

| 维度 | 内容 |
|------|------|
| **能做** | 编写 CSS 变量/主题/暗黑模式/响应式/动效、维护 theme.css、实现设计稿 |
| **不能做** | 改业务逻辑、改接口调用、改数据结构 |
| **产出物** | theme.css、全局样式文件、UI 组件样式 |

#### 9. 测试工程师 `QA-Engineer`

| 维度 | 内容 |
|------|------|
| **能做** | 编写 Vitest 单元测试、Playwright E2E 测试、接口测试、回归测试 |
| **不能做** | 修改业务源码、新增功能 |
| **产出物** | 测试文件、测试报告 |

#### 10. DevOps 工程师 `DevOps`

| 维度 | 内容 |
|------|------|
| **能做** | Docker 编排、PM2 部署、CI/CD 流水线、Nginx 配置、BullMQ 管理、监控配置 |
| **不能做** | 写业务代码、改前端逻辑 |
| **产出物** | Dockerfile、docker-compose、CI 配置、部署脚本 |

#### 11. 安全审计师 `Security-Auditor`

| 维度 | 内容 |
|------|------|
| **能做** | 扫描 Zod 缺失、SQL 注入、XSS/CSRF/CSP 漏洞、JWT 安全、RBAC 实施 |
| **不能做** | 新增业务功能、改架构 |
| **产出物** | 安全审计报告、漏洞修复建议 |

#### 12. 文档工程师 `Doc-Writer`

| 维度 | 内容 |
|------|------|
| **能做** | 编写 README/API 文档/架构图/CHANGELOG/FAQ/部署手册 |
| **不能做** | 修改代码、新增功能 |
| **产出物** | Markdown 文档、Swagger 注解 |

#### 13. 规则维护师 `Rules-Keeper`

| 维度 | 内容 |
|------|------|
| **能做** | 运行 audit-rules.js、同步 CLAUDE.md 数据点、更新 Memory 文件、触发钩子 |
| **不能做** | 修改业务代码、新增功能 |
| **产出物** | 规则更新 PR、审计报告 |

### 7.3 Agent 协作流程

```
用户需求
   ↓
[Product-Manager] 需求分析→用户故事→PRD→功能优先级→验收标准
   ↓
[Orchestrator] 接收 PRD → 拆分任务 → 分派
   ↓
[Architect] 审核技术方案（需要时）
   ↓
[Orchestrator] 并行分派任务
   ├── [Backend-A]  写 Controller/Route/Middleware
   ├── [Backend-B]  写 Service/DAO
   ├── [Frontend-A] 写业务页面
   ├── [Frontend-B] 写基础设施
   └── [UI-Designer] 写样式主题
   ↓
[Security-Auditor] 并行安全扫描
   ↓
[QA-Engineer] 测试 + 回归（对照 Product-Manager 验收标准）
   ↓
[Doc-Writer] 更新文档
   ↓
[Rules-Keeper] 同步规则文件
   ↓
[Orchestrator] 五维质量验收 → [Product-Manager] 确认符合 PRD → 汇报给用户
```

### 7.4 严格约束

| 规则 | 内容 |
|------|------|
| **禁止跨界** | 各 Agent 只做职责范围内，跨职责需向 Orchestrator 申请 |
| **禁止改架构** | 任何新增依赖/技术栈必须经 Architect 审批 |
| **禁止乱加技术** | 仅使用 §2.1 锁定的技术栈，不得引入新框架 |
| **禁止绕过审核** | 所有代码变更须有 Code Review（Architect 或 Orchestrator） |
| **禁止合并冲突** | 同一文件不得多 Agent 同时编辑，Orchestrator 负责文件级别的排他锁 |
| **要求可追溯** | 所有 Agent 产出物须标注 Agent 编号和任务编号 |

---

## 8. 分阶段开发计划

### 8.1 总体时间线

| 阶段 | 内容 | 周期 |
|------|------|:--:|
| 🔴 **Phase 1** | P0 安全架构修复 | 5 天 |
| 🟠 **Phase 2** | P1 质量补全 | 7 天 |
| 🟡 **Phase 3** | 聚焦开发（图片+视频+文案+DIY页面编辑器+提示词+AI增强） | 30 天 |
| 🟢 **Phase 4** | 文档与收尾 | 3 天 |
| **合计** | | **45 天** |

### 8.2 🔴 Phase 1 — P0 安全架构修复（已完成 ✅）

| 日 | 任务 | 结果 |
|:--:|------|------|
| D1 | 25 个 DAO 接入 tenantPool（ALS 透明注入） | ✅ |
| D2 | auth.middleware.js 接入 JWT 黑名单 + tenantId 设置 | ✅ |
| D3 | adminAuth 黑名单 + RBAC 路由接入 + 删除重复 role.middleware | ✅ |
| D4 | 8 个直写 SQL Service 迁移到 DAO（creditService/commerceService） | ✅ |
| D5 | 中间件排序修正（auth→tenant→audit） | ✅ |

### 8.3 🟠 Phase 2 — P1 质量补全（已完成 ✅）

| 日 | 任务 | 结果 |
|:--:|------|------|
| D6-7 | 全局错误处理器 + Service try-catch 模式统一 | ✅ |
| D8 | 37/37 admin 页面确认非空壳 + Zod 覆盖 50/50 路由文件 | ✅ |
| D9-12 | 重复代码清理 + 代码规范验证 | ✅ |

### 8.4 🟡 Phase 3 — 聚焦开发（第 13-42 天）

| 日 | 任务 | 说明 |
|:--:|------|------|
| **D13-14** | **N1 13平台尺寸配置化** + A1/A2/A3 | 平台规格 CRUD + 一键适配输出 |
| **D15-17** | **N2 商品标题+卖点文案** + A4/A5 | 多平台规则适配标题生成 + 结构化卖点文案 |
| **D18-20** | **N3 跨境翻译+本地化** + A6 | 9语种电商话术本地化（非直译） |
| **D21-23** | **N4 短视频脚本生成** + A7 | 抖音/视频号/TikTok 三平台差异化脚本 |
| **D24-25** | **N5 图片对比/AB测试** | 并排/滑动/叠图对比 + 多风格网格（前端已部分完成） |
| **D26-28** | **N6 提示词增强-收藏分组** + A8/A9/A10/A11 | 100+电商预设 + 收藏 + 分组 CRUD + 官方分组 |
| **D29-30** | **N6 提示词增强-智能推荐** + A12 | 场景联动推荐 + {{变量}}自动解析 + 使用记录 |
| **D31-32** | **N9 AI调用增强** + A24 | 主备模型切换 + Token统计 + 中断恢复 |
| **D33-36** | **N7 DIY页面管理系统** + A13-A20/A23 | 模板库≥20个 + 状态机 + 双端配置 + 版本管理 + 权限分离 + 访问统计 |
| **D37-42** | **N8 拖拽可视化编辑器** + A21/A22 | 组件库 + 画布 + 图层 + 属性面板（表单式） + 自动保存 + 操作引导 |

### 8.5 🟢 Phase 4 — 文档与收尾（第 43-45 天）

| 日 | 任务 |
|:--:|------|
| D43 | README/API 文档/Swagger 注解完善 |
| D44 | 架构图更新 + CHANGELOG + 部署手册 |
| D45 | 全链路回归测试 + 安全终审 + 验收 |

---

## 附录 A. 项目数据快照

| 指标 | 数值 |
|------|:--:|
| 前端页面 | 113 |
| 前端组件 | 16 |
| 前端 Composable | 15 |
| Pinia Store | 3 |
| 后端控制器 | 38 |
| 后端服务 | 41 |
| 后端 DAO | 25 |
| 后端路由 | 36 |
| 中间件 | 12 |
| 数据库表 | 33（+9 待新增） |
| 测试文件 | 23 |
| 开发模式 | 单人全栈 |
| 当前阶段 | Phase 2 完成，待启动 Phase 3 |
| 项目总周期 | 45 天（Phase 1+2 已完成 12 天，Phase 3 剩余 30 天，Phase 4 剩余 3 天） |

## 附录 B. 技术栈锁定清单

见 §2.1，所有 AI Agent **不得自行新增**未列入清单的技术/依赖。任何新增须经 Architect 审批。

## 附录 D. 新增数据库表（聚焦版）

### D.1 电商平台尺寸规范表

```sql
-- 13平台图片尺寸规范配置
CREATE TABLE IF NOT EXISTS platform_image_spec (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  platform_code VARCHAR(30) UNIQUE NOT NULL COMMENT '平台编码: taobao/jd/pdd/douyin/amazon/shopee/lazada/...',
  platform_name VARCHAR(50) NOT NULL COMMENT '平台中文名',
  main_image_width INT NOT NULL COMMENT '主图宽度px',
  main_image_height INT NOT NULL COMMENT '主图高度px',
  detail_image_width INT,
  detail_image_height INT,
  video_width INT,
  video_height INT,
  video_max_sec INT DEFAULT 60,
  formats JSON COMMENT '支持格式: ["jpg","png","webp"]',
  max_size_kb INT DEFAULT 3072 COMMENT '单张最大KB',
  bg_must_white TINYINT DEFAULT 0 COMMENT '是否必须白底',
  status TINYINT DEFAULT 1,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### D.2 DIY 页面系统表（3 项，N7/N8）

```sql
-- DIY页面主表
CREATE TABLE IF NOT EXISTS diy_page (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT UNSIGNED NOT NULL DEFAULT 0,
  user_id INT UNSIGNED NOT NULL,
  title VARCHAR(100) NOT NULL,
  description VARCHAR(500),
  template_id INT UNSIGNED COMMENT '来源模板ID',
  pc_config JSON COMMENT 'PC端完整配置JSON',
  mobile_config JSON COMMENT '移动端完整配置JSON',
  status TINYINT DEFAULT 0 COMMENT '0=草稿 1=待审核 2=已发布 3=已下线 4=回收站',
  access_url VARCHAR(300),
  review_reject_reason VARCHAR(500),
  pv INT DEFAULT 0 COMMENT '页面PV',
  uv INT DEFAULT 0 COMMENT '页面UV',
  is_deleted TINYINT DEFAULT 0,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  publish_time DATETIME COMMENT '发布时间',
  INDEX idx_user_status (user_id, status),
  INDEX idx_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- DIY页面版本快照表
CREATE TABLE IF NOT EXISTS diy_page_version (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  page_id INT UNSIGNED NOT NULL,
  version_type TINYINT DEFAULT 0 COMMENT '0=自动快照 1=手动版本',
  version_note VARCHAR(500),
  pc_snapshot JSON,
  mobile_snapshot JSON,
  is_deleted TINYINT DEFAULT 0,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_page (page_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- DIY页面模板库表（运营人员一键套用）
CREATE TABLE IF NOT EXISTS diy_template (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(30) NOT NULL COMMENT 'industry: womenswear/3c/beauty/home/food/sports/...',
  preview_url VARCHAR(500) COMMENT '模板预览图',
  pc_config JSON COMMENT 'PC端完整配置JSON',
  mobile_config JSON COMMENT '移动端完整配置JSON',
  use_count INT DEFAULT 0 COMMENT '使用次数',
  status TINYINT DEFAULT 1 COMMENT '1=启用 0=禁用',
  sort_order INT DEFAULT 0,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 编辑器组件库表
CREATE TABLE IF NOT EXISTS diy_component (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL COMMENT '组件名',
  display_name VARCHAR(50) NOT NULL COMMENT '显示名称（运营人员可见）',
  category VARCHAR(30) NOT NULL COMMENT 'basic=基础 / ecommerce=电商 / ai=AI',
  icon VARCHAR(50),
  default_props JSON COMMENT '默认属性',
  default_styles JSON COMMENT '默认样式',
  description VARCHAR(200) COMMENT '组件用途说明（运营人员可见）',
  status TINYINT DEFAULT 1,
  sort_order INT DEFAULT 0,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 页面操作日志表
CREATE TABLE IF NOT EXISTS diy_page_log (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  page_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  action VARCHAR(30) NOT NULL COMMENT 'create/edit/submit/review_approve/review_reject/publish/unpublish/delete/rollback',
  detail VARCHAR(500),
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_page (page_id),
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### D.3 提示词增强表（3 项，N6）

```sql
-- 提示词收藏表
CREATE TABLE IF NOT EXISTS prompt_favorite (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  template_id INT UNSIGNED NOT NULL,
  group_id INT UNSIGNED DEFAULT NULL,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_template (user_id, template_id),
  INDEX idx_user_group (user_id, group_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 提示词分组表
CREATE TABLE IF NOT EXISTS prompt_group (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED DEFAULT NULL COMMENT 'NULL=官方分组',
  group_name VARCHAR(50) NOT NULL,
  description VARCHAR(200),
  tags JSON,
  sort_order INT DEFAULT 0,
  is_official TINYINT DEFAULT 0 COMMENT '0=个人 1=官方只读',
  is_hidden TINYINT DEFAULT 0,
  is_deleted TINYINT DEFAULT 0,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_official (is_official)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 提示词使用记录表
CREATE TABLE IF NOT EXISTS prompt_usage_history (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  template_id INT UNSIGNED NOT NULL,
  variables_json JSON COMMENT '用户填写的变量值',
  generated_content TEXT COMMENT '生成的文案',
  ai_model VARCHAR(30),
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_time (user_id, create_time DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### D.4 新增数据库表汇总

| 表名 | 模块 | 用途 |
|------|------|------|
| `platform_image_spec` | 图片增强 | 13 平台尺寸规范配置 |
| `diy_page` | DIY 页面 | 页面主表（双端配置+状态机+统计） |
| `diy_page_version` | DIY 页面 | 版本快照+回滚 |
| `diy_template` | DIY 页面 | 行业模板库（运营人员一键套用） |
| `diy_component` | 编辑器 | 组件库（运营人员友好描述） |
| `diy_page_log` | DIY 页面 | 全操作日志 |
| `prompt_favorite` | 提示词 | 用户收藏 |
| `prompt_group` | 提示词 | 自定义分组+官方分组 |
| `prompt_usage_history` | 提示词 | 使用记录 |

**共新增 9 张表**。

## 附录 E. 错误码模块前缀

| 前缀 | 模块 | 范围 |
|------|------|------|
| EC_AUTH | 认证 | 1001-1999 |
| EC_USER | 用户 | 2001-2999 |
| EC_IMAGE | 图片 | 3001-3999 |
| EC_VIDEO | 视频 | 4001-4999 |
| EC_BATCH | 批量 | 5001-5999 |
| EC_PAYMENT | 支付 | 6001-6999 |
| EC_UPLOAD | 上传 | 7001-7999 |
| EC_ADMIN | 管理 | 8001-8999 |
| EC_COPY | 文案生成 | 9001-9999 |
| EC_PLATFORM_SPEC | 平台尺寸 | 10001-10999 |
| EC_PROMPT_GROUP | 提示词分组 | 11001-11999 |
| EC_PROMPT_FAV | 提示词收藏 | 12001-12999 |
| EC_DIY_PAGE | DIY页面管理 | 13001-13999 |
| EC_DIY_EDITOR | 拖拽编辑器 | 14001-14999 |
| EC_AI_CALL | AI调用增强 | 15001-15999 |

---

> **文档维护**: Rules-Keeper 每 15-20 轮对话自动审计本文件数据点一致性。  
> **生效日期**: 2026-05-07  
> **审核**: Orchestrator + Architect
