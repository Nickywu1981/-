# CLAUDE.md — Movio AI · AI 行为规则书

> 本文件是 AI 助手的最高行为准则。所有规则永久锁定，不得违背、不得简化、不得省略。
> 版本：v2.0 | 2026-05-07 | 来源：AI素材生成规则包 19 章 831 行 + Movio AI 实战适配

---

## 核心规则清单（12 条铁律，每次对话必检）

| # | 规则 | 说明 |
|---|------|------|
| 1 | **前后端分离** | 前端纯展示+交互，后端全权业务逻辑+AI模型调用 |
| 2 | **技术栈锁定** | 非经用户确认，禁止变更任何框架/库版本 |
| 3 | **模块化隔离** | 每个AI能力独立模块，零耦合，统一接口 |
| 4 | **提示词模板化** | 所有提示词统一管理 `server/src/services/` 目录，禁止代码内硬编码 |
| 5 | **安全第一** | API Key 加密存储 + 提示词注入防护 + 内容审核 |
| 6 | **生成记录可追溯** | 每次生成记录完整 prompt + model + params + output + cost |
| 7 | **Git 铁律** | 新会话确认Git状态，每次改动立即单独提交，禁止批量混合提交 |
| 8 | **五位一体** | 技术+产品+运营+UI+智能 五维同时激活 |
| 9 | **框架版本锁** | 变更框架版本必须先经用户确认，禁止自动升级 |
| 10 | **VSCode 格式化** | 保存自动 Prettier+ESLint+OrganizeImports |
| 11 | **防反复出错** | 每次修复后更新速查表，同类错误不再犯 |
| 12 | **主动建议** | 每完成功能输出五维建议+落地实施方案 |

---

## 🚨 框架版本变更铁律（永久锁定）

```
┌─────────────────────────────────────────────────────────────┐
│  ⛔ 禁止：未经用户确认，自行升级/降级/更换任何框架或依赖版本  │
│  ⛔ 禁止：npm install / yarn add / pnpm add 自动安装最新版本  │
│  ⛔ 禁止：自动执行 npm update / npm audit fix --force       │
│  ✅ 必须：变更版本前先列出影响范围 → 等用户确认 → 再执行     │
│  ✅ 必须：所有依赖版本锁定在 package.json（去 ^/~ 前缀）     │
└─────────────────────────────────────────────────────────────┘
```

---

## 一、技术栈与核心原则

### 后端
- Node.js + Express（永久锁定）
- MySQL 8.0 + Redis 缓存
- AI 模型适配层：统一接口，多模型支持

### 前端
- Nuxt3 + Vue3 + TypeScript + SSR（strict TS、移动端优先、响应式）
- Element Plus（PC 后台）+ Vant（移动端 H5）
- Pinia 状态管理 + ECharts 图表

### 配套环境
- 文件存储：MinIO 本地对象存储
- 部署：Docker + Nginx + PM2
- 监控：Prometheus metrics + 健康检查端点

### 工程化配套 — 六件套

| # | 配套 | 状态 | 位置 |
|---|------|------|------|
| 1 | **VSCode 自动格式化** | ✅ | `.vscode/settings.json` — Prettier+ESLint+OrganizeImports |
| 2 | **axios 全局拦截** | ✅ | `client/composables/useApi.ts` — Token+CSRF+401/403+重试+请求ID |
| 3 | **dotenv 环境变量** | ✅ | 启动自动加载 `.env` |
| 4 | **Zod 全局校验** | ✅ | `server/src/utils/validate.js` — `validate(schema)`，32/32 路由全覆盖 |
| 5 | **Express 限流** | ✅ | `server/src/middleware/rateLimiter.js` — authLimiter+codeLimiter+global |
| 6 | **Swagger 文档** | ✅ | `server/src/swagger.json` — 34 端点覆盖 |

### 产品定位
Movio AI 电商视觉创作平台 — 服务国内(淘宝/拼多多/抖音/小红书)+跨境(亚马逊/Temu/Shein/TikTok/美客多/Ozon/Shopee/Lazada)13大平台。免费试用+会员付费模式。图片+视频全功能一体化闭环。

### 核心业务数据模型（速查）
```
users（用户）
  ├── projects（项目/工作空间）
  ├── prompt_templates（提示词模板库）
  ├── generations（生成记录）→ output_assets（输出素材）
  ├── assets（素材库）→ asset_tags（标签）
  ├── model_configs（AI 模型配置）
  ├── api_keys（加密 API 密钥）
  ├── usage_logs（用量日志）
  └── billing_records（计费记录）
```
所有表均含 `is_deleted` 逻辑删除 + `create_time`/`update_time`。

### 核心铁律
- 前端只管页面展示，数据和业务逻辑全权后端
- 禁止前端写业务逻辑、硬编码规则、禁止前端直接调 AI 模型
- 提示词统一后端模板管理
- 接口契约化，前后端职责完全割裂

---

## 二、AI 协作规则

### 思考模式
1. 主动预判需求、补全缺失环节、推演后续功能，不反问不等待
2. 举一反三：同类业务、报错、架构复用最优经验
3. 自带产品+架构+全栈思维
4. 纠错自省：输出前自检架构、代码、逻辑
5. 永久记住用户个人习惯、项目偏好

### 四步思考流程（任何问题必走）
1. **拆解**：理解真实需求，补全碎片化细节
2. **发散**：2-3 种方案，对比优劣/风险/难度
3. **复盘**：检查逻辑漏洞、边界场景、潜在报错
4. **收敛**：输出商用级完整方案

### 防失忆机制
- 每 15-20 轮自动重读核心记忆（6 个文件）
- 会话中断自动继承所有规则
- 回答跑偏→自动复位
- 每接收一条消息先自检合规

### 🔥 防反复出错速查表（10 条最高频错误）

| # | 错误类型 | grep 检查命令 |
|---|---------|-------------|
| 1 | 硬编码 API Key | `grep -r "sk-\|apiKey\|api_key" --include="*.{vue,ts,js}"` |
| 2 | 提示词硬编码 | `grep -r "prompt.*=.*'" --include="*.{vue,ts,js}"` |
| 3 | v-for 缺 :key | `grep -r "v-for" --include="*.vue"` |
| 4 | 空 catch 块 | `grep -r "catch\s*{" --include="*.{ts,js}"` |
| 5 | 硬编码 URL | `grep -r "localhost\|api\." --include="*.{vue,ts}"` |
| 6 | 未使用 import | ESLint: `@typescript-eslint/no-unused-vars` |
| 7 | 裸 $fetch 调用 | `grep -r "\$fetch" --include="*.{vue,ts}"` |
| 8 | 模块跨层调用 | `grep -r "require.*modules/" --include="*.js"` |
| 9 | 前端 AI 调用 | `grep -r "openai\|anthropic\|stable.diffusion" --include="*.{vue,ts}"` |
| 10 | 密码/密钥明文 | `grep -r "secret\|password\|token.*=" --include="*.{ts,js,vue}"` |

### 🔥 编码铁律（4 条，禁止反复犯错）

| # | 铁律 | 历史教训 |
|---|------|---------|
| 1 | **v-for 必须写 `:key`** | 历次审计反复发现缺失，每次修完又犯 |
| 2 | **catch 块必须有错误处理** | 静默吞错导致线上 Bug 无法追踪，最小处理：`console.error('[模块]', err)` |
| 3 | **禁止硬编码 URL/域名/端口** | "just for testing" 的 `http://localhost:3002` 反复泄露到 CI |
| 4 | **清理未使用的 import** | 历次清理 ~100 行死代码，ESLint `no-unused-vars: error` 后不再犯 |

### 🔥 商业运营视角（设计功能时自动思考）
1. **管理员操作**：后台如何管理？需要哪些配置项？如何批量操作？
2. **用户体验**：用户如何使用？操作是否便捷？提示是否清晰？
3. **日常运维**：如何监控数据？如何处理异常？用量如何统计？
4. **后期迭代**：功能如何扩展？数据如何兼容？接口如何升级？

### 🔥 报错 & 问题排查三步法
1. **根因分析**：问题的根本原因
2. **即时修复**：立即解决问题的方案
3. **长期预防**：避免再次发生的措施

---

## 三、架构分层规范

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

### 项目目录结构
```
├── client/                    # Nuxt3 前端
│   ├── pages/                 # 页面（112个）
│   │   ├── work/              # 工作台页面（41个AI功能页）
│   │   ├── admin/             # 管理后台（35个）
│   │   └── account/           # 用户账户（11个）
│   ├── components/            # 通用组件
│   ├── composables/           # 组合式函数（useApi/useAuth/useToast等）
│   ├── stores/                # Pinia 状态管理
│   ├── assets/css/            # 全局样式+主题
│   ├── plugins/               # Nuxt插件
│   └── server/middleware/     # Nitro服务端中间件
├── server/                    # Express 后端
│   └── src/
│       ├── controller/        # 38个控制器
│       ├── services/          # 业务逻辑层
│       ├── dao/               # 数据访问层
│       ├── route/             # 36条路由文件
│       ├── middleware/        # 鉴权/限流/缓存/日志
│       ├── utils/             # 工具（分页/校验/响应/加密）
│       └── constants/         # 错误码/枚举/全局常量
└── docker/                    # Docker 部署配置
```

### 全局统一响应格式
```js
// 成功
{ code: 200, msg: "success", data: {...} }
// 分页成功
{ code: 200, msg: "success", data: { list: [...], total: 100, page: 1, pageSize: 20 } }
// 错误
{ code: 400/401/403/404/500, msg: "错误信息", data: null }
// 异步任务
{ code: 202, msg: "processing", data: { taskId: "xxx" } }
```

### API 校验链（3 层）
```
1. middleware/validate.js (Zod schema 校验，422 标准错误)
2. controller 参数级校验（类型/范围/格式）
3. service 业务规则校验（权限/配额/成本）
```

### API 演化规范
- **新增字段**：直接在响应中新增，前端按需使用（向后兼容）
- **弃用字段**：标记 `@deprecated` 保留 2 个版本，然后删除
- **修改字段类型**：新版本新建 `/v2/` 端点，旧版本标注弃用时间线
- **删除端点**：标记 `@deprecated` 保留 3 个月，文档中移除，返回 410 Gone
- **破坏性变更**：必须 bump MAJOR 版本号

### 防御性编程铁律
- 永远不信任外部输入，永远不信任 AI 模型输出
- AI 返回结果必须校验格式/类型/内容，不合法时自动重试或降级
- 文件上传必须有类型白名单 + MIME 检测 + 大小限制
- 所有异步操作必须有超时 + 重试 + 降级策略

---

## 四、数据库 / 缓存 / 安全

### 数据库命名规范
- 表名：小写+下划线 (`user_projects`)
- 字段名：小写+下划线 (`create_time`)
- 索引：`idx_表名_字段名`
- 金额用 `DECIMAL(10,2)`，状态用 `TINYINT`

### 必含基础字段
```sql
id INT PRIMARY KEY AUTO_INCREMENT
create_time DATETIME DEFAULT CURRENT_TIMESTAMP
update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
is_deleted TINYINT DEFAULT 0
```

### Redis 缓存规范
- **缓存 Key 格式**：`movio:{模块}:{标识}`
- **热点缓存**：模型列表、提示词模板、素材分类
- **更新规则**：新增/编辑/删除后主动清除对应缓存
- **过期时间**：统一可配置，禁止代码里到处写死秒数

### SQL 安全（红线）
- 所有 SQL 查询必须参数化，**严禁直接拼接用户输入**
- 统一 `mysql2/promise` 参数化查询
- 禁止 SQL 直接拼接 `id`/`page`/`keyword` 等用户参数

### 安全规范
- **API Key 管理**：AES-256 加密存储，按用户隔离，支持轮换+过期，日志禁止打印
- **提示词注入防护**：用户输入清洗过滤，敏感指令检测
- **内容安全**：生成结果过敏感词审核，违规拦截+记录
- **接口安全**：JWT 鉴权 + RBAC + express-rate-limit + Helmet 安全头 + CSP

---

## 五、开发实操指南

### 启动命令

| 操作 | 命令 |
|------|------|
| 后端开发 | `cd server && node src/index.js` |
| 前端开发 | `cd client && npx nuxi dev --port 3000` |
| 前端构建 | `cd client && npx nuxi build` |
| Docker 部署 | `docker-compose up -d` |
| 健康检查 | `curl http://localhost:3001/api/health` |

### 🔥 服务启动就绪探针
`/api/health` 端点必须完成以下 4 项检查后才返回 200：
- MySQL 连接（5s 超时，重试 3 次间隔 2s，失败 → exit(1)）
- Redis 连接（3s 超时，失败降级）
- 数据库迁移检查
- 路由注册完成

### 端口分配

| 服务 | 开发 | 生产 |
|------|------|------|
| Nuxt3 前端 | 3000 | Nginx 80 |
| Express 后端 | 3001 | 3001 |
| MySQL | 3306 | 3306 |
| Redis | 6379 | 6379 |
| MinIO | 9000 | 9000 |

### 🔥 端口安全铁律
- **白名单（可关）**: 3000, 3001, 3306, 6379, 9000, 9001
- **保护名单（绝对禁止关闭）**: 37808 等其他进程端口
- 关闭前必须检查占用，非本项目进程不杀
- 禁止批量范围杀端口（如 `kill-port 3000-9000`）

### VSCode 格式化铁律（全员统一）
- 保存自动：Prettier 格式化 + ESLint 修复 + OrganizeImports
- 统一参数：`singleQuote: true / semi: false / trailingComma: "all" / printWidth: 120 / tabWidth: 2 / endOfLine: "lf"`
- 文件覆盖：Vue / TS / JS / CSS / SCSS / JSON / YAML / Markdown / HTML
- CR 聚焦逻辑/安全/性能，格式由工具保证

### Nginx 生产关键约束
- `client_max_body_size 20M;`
- gzip 压缩
- 安全头：`X-Frame-Options / X-Content-Type-Options / HSTS`
- `/api/` 反向代理到后端

### 关键环境变量速查

| 变量 | 必填 | 敏感 | 说明 |
|------|------|------|------|
| `PORT` | ✅ | — | 后端端口 |
| `DB_HOST/USER/PASSWORD/NAME` | ✅ | ✅ | 数据库连接 |
| `REDIS_URL` | ✅ | ✅ | Redis 连接 |
| `JWT_SECRET` | ✅ | ✅ | JWT 签名密钥 |
| `OPENAI_API_KEY` | — | ✅ | OpenAI API Key |
| `CLAUDE_API_KEY` | — | ✅ | Claude API Key |
| `MINIO_ACCESS_KEY/SECRET_KEY` | ✅ | ✅ | 对象存储凭证 |

---

## 六、Git 与交付

### 提交格式
```
type(scope): subject
```
type: `feat`/`fix`/`docs`/`style`/`refactor`/`perf`/`test`/`build`/`ci`/`chore`/`revert`

### Git Flow 分支模型

```
main (生产)
  ├── develop (开发主线)
  │     ├── feat/{模块}-{简述}
  │     ├── fix/{模块}-{简述}
  │     └── refactor/{模块}-{简述}
  └── hotfix/{日期}-{简述}
```

- `main` / `develop` 保护分支，禁止直接提交
- PR 合并默认 Squash and merge
- 合并后立即删除功能分支

### 🔥 快速检查清单（六维，逐项打勾）

**✅ 技术维度**（8 项）
- [ ] 遵循技术栈？商用级别代码？参数校验？异常处理？
- [ ] 边界容错？代码注释？适配部署环境？备份与迁移适配？

**✅ 产品维度**（7 项）
- [ ] 功能闭环？用户体验？状态管理？权限控制？
- [ ] 多角色适配？操作日志？合规要求？

**✅ 运营维度**（7 项）
- [ ] 后台好管理？批量操作？可配置化？
- [ ] 数据统计？精细化运营？商业化？风控？

**✅ UI 维度**（7 项）
- [ ] 商用 UI？统一风格？交互人性化？细节优化？
- [ ] 品牌定制？无障碍设计？移动端适配？

**✅ 建议维度**（6 项）
- [ ] 技术/产品/运营/UI/风险 各 ≥2 条建议？落地实施方案？

**✅ 协作与存档维度**（5 项）
- [ ] 协作文档？进度同步？存档更新？备份？验收文档？

### 测试规范
- **后端**：Vitest，`server/src/__tests__/`（23 文件 108 用例全部通过）
- **前端**：Vitest + @vue/test-utils，`client/utils/__tests__/` + `client/stores/__tests__/`
- **E2E**：Playwright，`client/e2e/`
- **命名**：`describe('模块', ...)` + `test('METHOD /path - 描述', ...)`

### 模块文档最低标准（4 份必有）
1. **README.md** — 模块概述、业务场景、核心流程
2. **API 接口清单** — 方法+路径+参数+响应
3. **依赖关系表** — 上游依赖+下游影响
4. **FAQ** — 至少 3 条典型问题及方案

### 🔥 特性开关（Feature Flag）规范
- 新功能必须包裹特性开关，默认 disabled
- 灰度比例：0%→10%→50%→100%，每阶段 ≥24h
- 稳定 30 天后移除开关代码
- 必须有"紧急关闭"能力，管理后台一键操作（`admin/site-config`）

### 依赖安全审查
- 新增依赖前检查：最后发布时间（>1年=风险）、周下载量（<1万慎用）、已知漏洞数、是否为微依赖
- `npm audit` 必须在 CI 运行

---

## 七、22 人顶级虚拟团队

全员全栈全能，专业优先、负载均衡、技能跨界、瓶颈补位：
产品架构师 / AI 产品经理 / 文档工程师 / AI 算法工程师 / Prompt 工程师 / 后端架构师 / 高级后端×2 / 前端架构师 / 高级前端×2 / UI 全链路设计师 / 品牌设计师 / 测试架构师 / DevOps 运维师 / 数据分析师 / 合规顾问 / 法务专员 / 财务专员 / 文案运营 / 运营策略 / 知识库运营

---

## 八、个人核心记忆

### 身份定位
- Movio AI 电商视觉创作平台开发者
- 风格：商用上线级别、拒绝 Demo 半成品、架构规范、逻辑闭环

### 当前项目状态
- **112 个前端页面**全部 200 OK
- **36 条后端路由**全部在线
- **38 个控制器**零内联 SQL
- **23 服务端测试**108 用例全部通过
- **Zod 校验 29/36 已覆盖**（36 条路由中 29 条已接入 validate schema）
- 品牌色：紫色 `#7C3AED`，CSS 变量 100% 覆盖

### 关键待办
1. 接入真实 AI API Key（OpenAI/Claude）
2. 接入真实支付商户（微信/支付宝）
3. 全站 i18n 页面翻译
4. 客户端 Vitest 可运行（需解决中文路径问题）

---

## 九、核心口诀与违规处理

```
模块独立不耦合，适配器统一接口；
提示词模板集中管，模型可换不改码；
素材管线全追溯，安全审核不可少；
开发自带商业思考，做完必过五维自检。
```

检测到违规代码/架构/逻辑 → 立即指出问题 → 说明原因 → 给出合规方案 → 自动批量修复 → 直到 100% 合规。

---

## 十、项目记忆系统

索引：`C:\Users\MyPC\.claude\projects\I---------\memory\MEMORY.md`

### 核心必读（每次会话前 6 个）
- `project_tech_stack.md` — 技术栈+模块化架构+安全规范
- `feedback_dev_rules.md` — 五点一体+前后端分离+分层架构
- `thinking_process_rule.md` — 四步思考流程
- `coding_conventions.md` — 编码规范
- `ui_capability_matrix.md` — 11 项 UI 自检清单
- `feedback_git_commit_rule.md` — Git 提交铁律

### 访问地址
- 首页：`http://localhost:3000`
- 登录：`http://localhost:3000/login`（`demo` / `demo123`）
- 工作台：`http://localhost:3000/workspace`
- 管理后台：`http://localhost:3000/admin/dashboard`

---

## 十一、统一错误码体系（永久锁定）

### 错误码结构
```
格式: EC_{模块}_{序号}
完整示例: EC_GEN_0001
```

### 模块前缀速查

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

### 系统通用错误码

| 码 | HTTP | message |
|----|------|---------|
| `EC_SYS_0001` | 500 | 服务器内部错误 |
| `EC_SYS_0002` | 404 | 路由不存在 |
| `EC_SYS_0006` | 429 | 请求过于频繁 |
| `EC_SYS_0007` | 413 | 请求体过大 |

### 使用示例
```js
// ✅ 正确
const { fail, ok } = require('../utils/response');
res.json(fail('EC_AUTH_0001', 'Token 已过期'));
res.json(ok({ taskId: 'xxx' }));

// ❌ 禁止
res.json({ code: 401, message: 'Token过期' });
res.status(500).json({ error: '服务器错误' });
```

### 强制规则
- 新错误码必须先登记在 `server/src/constants/errorCodes.js`
- 禁止裸 HTTP 状态码，所有错误必须走 `fail(code, message)` 包装
- 同一错误场景使用同一错误码
- 前端根据 `code` 字段做统一错误处理

---

## 十二、部署与容灾手册（生产必备）

### 蓝绿部署流程
```
① 启动新版本(3002) → ② 健康检查 → ③ Nginx 切流量
  → ④ 旧版本保留 5 分钟观察 → ⑤ 旧版本下线
  异常时 → 一键回滚 Nginx 切回 3001
```

### 容灾目标（SLA 强制）

| 指标 | 目标 | 测量方式 |
|------|------|---------|
| **RPO**（数据恢复点） | ≤ 1 小时 | 每小时增量备份 |
| **RTO**（服务恢复时间） | ≤ 4 小时 | 从故障到恢复 |
| **可用性** | 99.5% | uptime 监控 |
| **P0 事故响应** | 15 分钟内 | 告警→响应 |

### 备份策略

| 类型 | 频率 | 保留 | 存储 |
|------|------|------|------|
| 全量数据库备份 | 每天 3am | 30 天 | MinIO |
| 增量 binlog | 每小时 | 7 天 | MinIO |
| Redis RDB | 每天 4am | 7 天 | MinIO |
| 配置文件 | 每次变更 | 永久 | Git |
| 恢复演练 | 每周日 5am | — | 恢复到 _restore_test 库 |

### 禁止行为
- 备份仅存本地（必须 MinIO/S3 异地同步）
- 备份后不验证恢复
- 跳过 dry-run 直接执行迁移
- 无回滚脚本的数据库变更

---

## 十三、回滚预案（强制）

### 必须回滚的场景

| # | 触发条件 | 响应时间 |
|---|---------|---------|
| 1 | **错误率 >5%** | 立即 |
| 2 | **P95 延迟 >3s** | 立即 |
| 3 | **核心接口不可用** | 立即 |
| 4 | **安全漏洞** | 立即 |
| 5 | **数据异常** | 立即 |
| 6 | **AI 模型成本异常飙升** | 5 分钟内 |

### 回滚步骤（5 步强制流程）
```
① 切流量 → ② 重启服务 → ③ 校验健康 → ④ 记录根因 → ⑤ 24h 复盘
```

### 禁止行为
- 回滚后不记录根因直接重新部署
- 跳过健康检查直接对外发布
- P0 事故后超 24h 不输出复盘报告

---

## 十四、版本号规范（强制）

### Semantic Versioning 2.0.0

| 段 | 含义 | 何时递增 |
|----|------|---------|
| **MAJOR** | 破坏性变更 | API 不向后兼容、删除端点、改变认证方式 |
| **MINOR** | 新功能 | 新增 API、新模块、新特性开关（向后兼容） |
| **PATCH** | Bug 修复 | 修 Bug、性能优化、安全补丁、文档 |

### 命名规范（全链路统一）
- **接口名**：RESTful 复数名词小写，kebab-case 多词路径
- **文件**：Vue 组件 PascalCase，Store camelCase，SQL 迁移 `YYYY-MM-DD-HHMMSS_desc.sql`
- **变量**：camelCase，常量 UPPER_SNAKE_CASE，布尔 `is/has/can` 前缀
- **缓存 Key**：`movio:{模块}:{标识}`
- **日志**：`[模块][级别] 消息 { key: value }`

---

## 十五、新人入职清单（可执行）

### 第一天：环境搭建
- [ ] 阅读 CLAUDE.md 全文
- [ ] 配置 `.env`（参考 `.env.example`）
- [ ] 安装依赖 + 启动前后端 + 确认 health check 200
- [ ] 安装 VS Code 推荐插件

### 第二天：架构理解
- [ ] 理解 6 层后端架构（Controller→Service→ModelAdapter→PromptTemplate→OutputFormatter→DAO）
- [ ] 理解 69 个前端页面结构（work/admin/account）
- [ ] 理解统一响应格式 `{code, msg, data}`
- [ ] 理解 32 条路由 + 35 个控制器
- [ ] 理解站点配置管理（admin/site-config 控制前端首页）

### 第三天：实操练习
- [ ] 运行服务端测试（23 文件 108 用例全部通过）
- [ ] 走通完整流程：用户登录→选择功能→上传素材→AI 生成→查看结果
- [ ] 用 `demo` / `demo123` 登录体验全部功能
- [ ] 提交第一个测试 commit

### 第四天：规范与工具
- [ ] 熟悉代码审查清单（十六）
- [ ] 熟悉五维自检（六）
- [ ] 了解 CI/CD 流程（十九）
- [ ] 了解回滚预案（十三）

---

## 十六、代码审查清单（必过）

### 安全审查（最高优先级）
- [ ] 无硬编码 API Key/密钥
- [ ] SQL 参数化，无字符串拼接
- [ ] 用户输入经清洗过滤（提示词注入防护）
- [ ] 生成内容经敏感词审核
- [ ] 文件上传有类型+大小检查
- [ ] 敏感数据脱敏处理
- [ ] 所有变更操作有 CSRF 校验

### 代码质量审查
- [ ] 无业务逻辑在前端、无 AI 调用在前端
- [ ] 提示词在模板文件中，非代码内硬编码
- [ ] 参数校验完整（Zod schema）
- [ ] 异常捕获完整（`asyncHandler` 包裹）
- [ ] 事务正确（多表写操作有 rollback）
- [ ] 统一响应格式
- [ ] 软删除（`is_deleted`，非物理 DELETE）
- [ ] v-for 有 `:key`
- [ ] 无未使用 import
- [ ] 组件样式 scoped

### 性能审查
- [ ] 无 N+1 查询
- [ ] 列表有分页
- [ ] 热点数据有缓存
- [ ] 缓存一致性
- [ ] AI 调用有超时+重试+降级

### 一票否决项

| 问题 | 严重性 |
|------|--------|
| 明文 API Key | 一票否决 |
| 提示词注入漏洞 | 一票否决 |
| SQL 注入 | 一票否决 |
| 跳过内容审核 | 一票否决 |
| 前端调 AI 模型 | 一票否决 |
| 物理删除 | 一票否决 |

---

## 十七、永久锁定规则（不可修改）

### 永久禁止（NEVER DO）

| # | 禁止事项 | 后果 |
|---|---------|------|
| 1 | 硬编码 API Key/密钥 | 安全事故 |
| 2 | 提示词硬编码在代码中 | 难以管理/优化 |
| 3 | 前端直接调 AI 模型 | 安全漏洞/Key 泄露 |
| 4 | SQL 字符串拼接 | SQL 注入 |
| 5 | 物理删除（DELETE） | 数据丢失 |
| 6 | 跳过内容安全审核 | 合规风险 |
| 7 | 跨模块直接调用 | 耦合/维护困难 |
| 8 | 裸返回响应 | 破坏统一格式 |
| 9 | 静默吞错 | 问题不可追踪 |
| 10 | 直接操作生产数据库 | 数据灾难 |
| 11 | 提交 .env 到 Git | 密钥泄露 |
| 12 | 绕过 CI 质量门禁 | 代码质量崩塌 |
| 13 | 修改核心业务管线流程 | 业务混乱 |
| 14 | 删除数据库备份 | 数据永久丢失 |
| 15 | 单方案输出 | 决策质量低 |

### 永久必须（ALWAYS DO）

| # | 必须事项 | 检查方式 |
|---|---------|---------|
| 1 | 所有 SQL 参数化 | Code Review |
| 2 | 统一响应 `{code, data, msg}` | response.js |
| 3 | 所有表含 `is_deleted` | 迁移检查 |
| 4 | Controller try-catch + asyncHandler | ESLint |
| 5 | 所有删除用软删除 | 审计触发器 |
| 6 | 金额用 DECIMAL(10,2) | 迁移检查 |
| 7 | 每次改动独立 Git 提交 | pre-commit |
| 8 | 新模块含 4 份文档 | PR checklist |
| 9 | 新功能含特性开关 | Code Review |
| 10 | 备份每天执行 + 每周验证 | cron |
| 11 | 生成记录完整追溯 | Code Review |
| 12 | 每功能输出五维建议 | 会话规则 |

### 不可变更项（CONSTITUTION）

| 项目 | 锁定值 | 变更流程 |
|------|--------|---------|
| 统一响应格式 | `{code, data, msg}` | 永不变更 |
| 软删除字段 | `is_deleted` TINYINT(1) DEFAULT 0 | 永不变更 |
| 模块化隔离 | 控制器→服务→DAO 单向依赖 | 永不变更 |
| 提示词模板化 | services/ 目录集中管理 | 永不变更 |
| API Key 加密 | AES-256 | 永不变更 |
| 品牌色 | `#7C3AED` 紫色 | 需用户确认 |

---

## 十八、技能分级体系（2026-05-07 锁定）

### ✅ 必开全局常驻（~30 个）

| 类别 | 技能 |
|------|------|
| 前端核心 | vue-expert-js / typescript-pro / javascript-pro / favicon |
| 架构设计 | architecting-solutions / architecture-designer / api-designer |
| 代码质量 | code-reviewer / code-documenter / simplify / refactoring-specialist |
| 安全 | secure-code-guardian / security-auditor / access |
| 运维部署 | deployment-engineer / performance-engineer |
| AI/智能 | self-improving-agent / claude-api / prompt-engineer / skill-creator |
| 数据库 | database-optimizer / sql-pro |
| 调试 | debugger / debugging-wizard |
| 测试 | qa-expert |
| 文档 | prd-planner / commit-helper / session-logger |

### ⭕ 可选后期用
brand-guidelines / frontend-design / playwright-expert / seo-content-writer / electron-wrapper

---

## 十九、自动化体系（2026-05-07 锁定）

### CI/CD 三步流水线

**1. ci.yml — 代码质量门控**（PR → 所有分支）：
```
Checkout → npm ci → npm audit → Secrets Scan → SQL Injection Scan
  → vue-tsc → Architecture Check → Unit Tests → Integration Tests
```

**2. 自动化部署**（push → main）：
```
Checkout → Tests(门控) → Build → Docker Build → Integration Tests
  → Deploy → Health Check → Smoke Test → 成功通知 / 失败自动回滚
```

**3. 夜间巡检**（每天 3am）：
```
Backup Verify → Data Integrity Check → npm audit → License Scan → Cache Warm
```

### PM2 进程管理
- `ecosystem.config.js` — 集群模式，movio-api + movio-nuxt
- 512M 内存重启阈值，错误日志分离

### Docker 一键部署
- `docker-compose.yml` — MySQL 8.4 + Redis + MinIO + Server + Client

### MinIO 使用规范

| 桶名 | 用途 | 权限 | 过期策略 |
|------|------|------|---------|
| `movio-uploads` | 用户上传 | 公开读 | 无过期 |
| `movio-generations` | AI 生成素材 | 公开读 | 无过期 |
| `movio-exports` | 导出文件 | 预签名 URL 7天 | 7 天后删除 |
| `movio-backups` | 数据库备份 | 私密 | 30 天保留 |

---

**最后更新**: 2026-05-07
**项目状态**: 112 页面 + 36 路由 + 38 控制器 + 108 测试用例 + Zod 29/36 覆盖，CSS 变量 100% 覆盖
**优先级**: 最高（所有开发必须遵守，永久锁定不再变更）

---

## 二十、规则自动维护机制（AI 必读）

> 规则文件必须随项目演进自动更新，**不需要用户提醒**。

### 触发条件（满足任一即执行）
1. **每 15-20 轮对话** → 全量审计 CLAUDE.md + MEMORY.md 数据点
2. **每次新增/删除页面** → 更新页面总数
3. **每次新增/删除路由** → 更新路由总数 + Zod 覆盖率
4. **每次测试数量变化** → 更新测试用例数
5. **每次安装/移除依赖** → 更新技术栈清单
6. **每次修复 bug 后** → 更新速查表 + CLUADE.md 防反复出错表

### 自检流程（AI 自动执行，不询问用户）

```
Step 1: grep 项目关键数字（页面数/路由数/测试数）
Step 2: 对比 CLAUDE.md 中的数字 → 不一致则自动更新
Step 3: 对比 MEMORY.md 中的路径/描述 → 不一致则自动更新
Step 4: 检查近期 git diff → 从变更推断是否需要更新规则
Step 5: 更新后输出「规则自检：X 处已同步」
```

### 禁止行为
- ❌ 等用户说"更新规则"才更新
- ❌ 规则数字与代码不一致时继续开发
- ❌ 跳过自检步骤

### 关键 grep 命令（速查）

```bash
# 页面数
find client/pages -name "*.vue" | wc -l
# 路由数
grep -c "router\.(get|post|put|delete)" server/src/route/*.js | tail -1
# 测试数
cd server && npx vitest run 2>&1 | grep "Tests"
# Zod 覆盖率
grep -l "validate(" server/src/route/*.js | wc -l
```
