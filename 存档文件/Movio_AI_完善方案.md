# Movio AI — 完善方案（v1.0）

> 日期：2026-05-07 | 基于：全栈审计 69 页面 + 32 路由 + 35 控制器 + 161 用例
> 原则：商用级别、拒绝 Demo、架构规范、逻辑闭环

---

## 总览

| 维度 | 建议数 | 优先级 |
|------|--------|--------|
| 🛠️ 技术 | 7 | 🔴 P0 紧急 |
| 📦 产品 | 7 | 🟡 P1 重要 |
| 📈 运营 | 5 | 🟡 P1 重要 |
| 🎨 UI | 4 | 🟢 P2 迭代 |
| 🧠 智能 | 4 | 🟢 P2 迭代 |
| 📋 文档 | 1 | 🔴 P0 配套 |
| **合计** | **28** | — |

---

## 执行路线图

```
第1周                第2周              第3周              第4周
├─ 🔴 P0 技术底座 ───┤                   │                   │
│  · AI API Key接入 · 消息队列(BullMQ)    │                   │
│  · Vitest修复     · 数据迁移工具(umzug) │                   │
│  · Redis持久化    · 日志采样           │  · 降级策略       │
│  · API文档生成                          │                   │
├────────────────────┤                   │                   │
│  ├─ 🟡 P1 产品运营 ───────────────────┤                   │
│  │  · 新手引导(StepWizard)              │  · 作品收藏夹     │
│  │  · 功能搜索(CommandPalette)          │  · 用量仪表盘     │
│  │  · 空状态通用组件(EmptyStateGuide)   │  · 免费额度策略   │
│  │  · 分享链接(预签名URL)               │  · 行为埋点       │
│  │                                     │  · 提示词市场     │
│  │                                     │  · SEO TDK       │
│  ├────────────────────────────────────┤                   │
│  │  ├─ 🟢 P2 UI + 智能 ──────────────┤                   │
│  │  │  · 骨架屏 · 进度可视化 · 微交互  │  · 移动端适配     │
│  │  │  · AI意图路由 · 自动补全提示词   │  · 异常自愈       │
│  │  │                                 │  · 规则巡检 ✅    │
└──┴──┴─────────────────────────────────┴───────────────────┘
```

---

# 🔴 P0 — 技术底座（第 1-2 周）

---

## 1. 接入真实 AI API Key

**现状**：14 个 AI 模块全部返回 Mock 数据，无真实 AI 能力

**方案**：

```
第1步：环境变量配置
├── server/.env
│   OPENAI_API_KEY=sk-xxx       ← 用户自行填写
│   OPENAI_BASE_URL=https://api.openai.com/v1
│   CLAUDE_API_KEY=sk-ant-xxx   ← 可选
│   SD_API_URL=http://localhost:7860  ← Stable Diffusion WebUI
│   AI_DEFAULT_MODEL=gpt-4o
│   AI_DEFAULT_IMAGE_MODEL=dall-e-3
│   AI_TIMEOUT_MS=60000
│   AI_MAX_RETRIES=3

第2步：ModelAdapter 层实现（server/src/services/adapters/）
├── BaseAdapter.js          ← 统一接口基类
│   generate(prompt, options) → { data, metadata, usage }
│   health() → { available, models, latency }
├── OpenAIGPTAdapter.js     ← 文案/脚本/标题/分析
├── ClaudeAdapter.js        ← 长文/合规/审核
├── SDAdapter.js            ← 图片生成类
├── DalleAdapter.js         ← 备选图片生成
│
├── AdapterRegistry.js      ← 多模型注册中心
│   register(name, adapter)
│   resolve(capability)     ← 按能力/成本/可用性选模型
│   fallback(from, to)      ← 降级链
│
└── PromptTemplates/        ← 提示词模板（按模块）
    ├── bgRemoval.js        ← 抠图提示词
    ├── sceneGen.js         ← 场景生成
    ├── tryon.js            ← 虚拟试衣
    └── scriptGen.js        ← 脚本生成（9语种）

第3步：渐进接入（按使用频率排序）
① remove-bg    → SD Inpaint       （3天）
② scene-gen    → SD Img2Img       （2天）
③ main-image   → DALL-E 3         （2天）
④ script-gen   → GPT-4o           （1天）
⑤ 其余10个模块 → 分批接入          （2周）
```

**风险**：
- API 成本不可控 → 加用户级调用上限（每人/天/次）+ 成本统计
- 模型不可用 → 自动降级链（GPT-4o → GPT-4o-mini → Mock）

---

## 2. 消息队列替换同步阻塞

**现状**：批量生成/视频生成耗时 10s-5min，HTTP 同步阻塞，用户干等

**方案**：

```
架构：
┌─────────┐   POST /api/image/batch    ┌──────────┐
│  Nuxt3  │ ──────────────────────────→ │ Express  │
│  前端    │ ←── 202 { taskId: "xxx" }  │  后端    │
└─────────┘                             └────┬─────┘
        │                                    │
        │  WS /ws/task/taskId                │ add job
        │  ←── { progress: 60% }              │
        │  ←── { progress: 100%, result }     ↓
        │                              ┌──────────┐
        └──────────────────────────────│  BullMQ  │
                                       │  Queue   │
                                       └────┬─────┘
                                            │
                                    ┌───────┴───────┐
                                    │  Worker Pool  │
                                    │  (3 workers)  │
                                    └───────────────┘

实现：
├── server/src/queues/
│   ├── queueManager.js     ← 队列管理器
│   │   createQueue(name, opts)
│   │   addJob(queue, data, opts)
│   │   getJobStatus(jobId)
│   │   getQueueStats(queue)
│   │
│   ├── workers/
│   │   ├── imageWorker.js  ← 图片任务（抠图/白底/场景/精修）
│   │   ├── videoWorker.js  ← 视频任务（生成/合成/编辑）
│   │   └── batchWorker.js  ← 批量任务（并发控制）
│   │
│   └── dashboard.js        ← Bull Board 管理面板
│       GET /admin/queues   ← 队列状态/失败重试/清理

改动范围：
- batchService.js    → 不再直接调 AI，改为 addJob()
- imageService.js    → 同步 API 保留，/batch 端点走队列
- videoService.js    → 全部走队列
- webSocket.js       → 已有 ✅，Worker 完成后 push 进度
- 前端 batch/remove-bg/video 等页面 → 改轮询为 WS 监听
```

---

## 3. 客户端 Vitest 修复

**问题**：Windows 中文路径 `I:\智能体助手项目\` 导致 vitest 模块解析失败

**方案**：

```
方案A（推荐）：项目迁移到 ASCII 路径
├── git clone 到 I:\movio-ai\
├── npm ci
├── npx vitest run  ← 通过

方案B（不迁移）：WSL 内运行
├── wsl --install Ubuntu
├── cd /mnt/i/movio-ai/client
├── npm ci && npx vitest run

方案C（应急）：跳过客户端测试，仅跑服务端
├── CI 中服务端 vitest 已通过（161用例）
├── E2E Playwright 替代客户端单元测试
```

---

## 4. 其余技术项（快速执行）

| # | 项目 | 工作量 | 方案 |
|---|------|--------|------|
| 4 | **Redis 持久化** | 0.5天 | `redis.conf`：`appendonly yes` + `save 900 1 300 10 60 10000` |
| 5 | **数据库迁移工具** | 1天 | `umzug` + `server/sql/migrations/` 目录，`npm run db:migrate` 脚本 |
| 6 | **日志采样** | 0.5天 | Winston 加 `sampleRate: 0.1`，高频接口只打 10%，错误 100% 记录 |
| 7 | **降级策略** | 1天 | AI 调用 3 次重试 → 换备选模型 → 降级到缓存结果 → 返回 Mock 兜底 |

---

# 🟡 P1 — 产品运营（第 2-3 周）

---

## 1. 新手引导三步向导

**现状**：69 个功能页，新用户登录后不知从何开始

**方案**：

```
组件：client/components/onboarding/StepWizard.vue

流程：
┌──────────────────────────────────────────────────────┐
│  Step 1: 选择你的平台                      [跳过]    │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐              │
│  │ 🍑 │ │ 📦 │ │ 🎵 │ │ 📕 │ │ 🌍 │              │
│  │淘宝│ │拼多多│ │抖音│ │小红书│ │跨境│  ← 平台卡片  │
│  └────┘ └────┘ └────┘ └────┘ └────┘              │
├──────────────────────────────────────────────────────┤
│  Step 2: 上传一张商品图                              │
│  ┌─────────────────────┐  ┌──────────────────┐     │
│  │   拖拽到此处上传      │  │   📷 示例图片     │     │
│  │   或点击选择文件      │  │   试试看效果      │     │
│  └─────────────────────┘  └──────────────────┘     │
├──────────────────────────────────────────────────────┤
│  Step 3: 看看 AI 能做什么                            │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐     │
│  │ ✂️ 抠图 │ │ 🎨白底 │ │ 🏞️场景 │ │ ✨精修 │     │
│  │ 3s完成  │ │ 2s完成  │ │ 15s完成 │ │ 8s完成  │     │
│  └────────┘ └────────┘ └────────┘ └────────┘     │
│                                                     │
│         [开始使用 Movio AI]                          │
└──────────────────────────────────────────────────────┘

触发条件：用户注册后首次登录 → 自动弹出
关闭条件：完成三步 或 点击"跳过"
记忆：localStorage '__movio_onboarding_done'
```

---

## 2. 功能搜索

**方案**：

```
组件：client/components/search/CommandPalette.vue

交互：
- 快捷键：Ctrl+K 唤起搜索面板
- 输入中文/拼音/英文模糊匹配 29 个工具
- 输入"抠" → 智能抠图/批量抠图/视频抠像
- 输入"白" → 白底图/白底批量
- 回车直接跳转

数据源：server/src/constants/toolIndex.js
[
  { id:'remove-bg', name:'智能抠图', keywords:['抠图','去背景','背景移除','remove bg'], route:'/work/remove-bg', icon:'scissor', category:'image' },
  ...29项
]
```

---

## 3. 空状态通用组件

**方案**：

```
组件：client/components/EmptyStateGuide.vue

Props:
- icon: string       ← 图标名
- title: string      ← "还没有作品"
- description: string ← "上传第一张图片，体验 AI 智能抠图"
- actionText: string  ← "上传图片"
- actionRoute: string ← "/work/remove-bg"
- showExample: boolean ← 是否显示示例按钮

使用（替换所有功能页的空状态）：
<EmptyStateGuide
  icon="image"
  title="拖入图片开始创作"
  description="支持 JPG/PNG/WebP，最大 20MB"
  actionText="上传图片"
  :showExample="true"
  @example="loadExampleImage"
/>
```

---

## 4. 运营项速览

| # | 项目 | 方案 |
|---|------|------|
| **作品收藏夹** | `client/pages/my/works.vue` 已有 ✅，补充：一键复用参数、对比原图 |
| **分享链接** | MinIO `presignedGetObject(url, 7*24*3600)`，复制链接+二维码 |
| **用量仪表盘** | `admin/dashboard.vue` ECharts 已有 ✅，补充：今日调用量/模型成本/活跃用户/热门功能 TOP5 |
| **免费额度** | 新用户 20 次 → 注册 +10 → 签到 +2/天 → 分享 +5 → 单用户日上限 50 次 |
| **行为埋点** | `server/src/services/analyticsService.js`：注册转化率/首上传率/首生成率/付费转化 |
| **提示词市场** | `admin/prompts.vue` + 前端"精选模板"Tab，运营推送爆款模板 |
| **SEO TDK** | 53 个功能页独立 title/description + JSON-LD 结构化数据 |

---

# 🟢 P2 — UI + 智能迭代（第 3-4 周）

---

## 1. 加载骨架屏

**方案**：

```
替换所有页面 loading 状态：

旧：<div v-if="loading">加载中...</div>

新：
<el-skeleton :loading="loading" animated :count="6">
  <template #template>
    <div class="skeleton-card">
      <el-skeleton-item variant="image" style="width:100%;height:200px" />
      <el-skeleton-item variant="text" style="width:60%" />
      <el-skeleton-item variant="text" style="width:40%" />
    </div>
  </template>
  <RealContent />
</el-skeleton>

覆盖范围：
① 工具卡片加载（workspace.vue）
② 生成结果加载（remove-bg/white-bg/scene/retouch）
③ 列表加载（my/works, my/credits, admin/*）
④ 管理后台表格加载（30个admin页面）
```

---

## 2. 生成进度可视化

**方案**：

```
组件：client/components/ProgressStepper.vue

步骤指示器：
  [1.上传] → [2.分析中] → [3.AI生成] → [4.优化渲染] → [5.完成]
     ✅          🔄            ⏳           ⏳           ⏳

Props:
- steps: string[]      ← ["上传","分析","生成","优化","完成"]
- current: number      ← 当前步骤索引
- status: 'waiting' | 'processing' | 'done' | 'error'

使用场景：
- remove-bg: 上传→检测→抠图→精细化→完成
- scene-gen: 上传→分析→场景生成→融合→完成
- video-gen: 上传→脚本生成→分镜→合成→导出
```

---

## 3. 移动端优先适配

**方案**：

```
适配范围（按优先级）：

第1批（高频页）：
├── remove-bg.vue     ← 上传区+结果对比+h5全屏
├── main-image.vue    ← 卡片竖排+底部固定生成按钮
├── scene.vue         ← 模板横滑+上传简化
└── workspace.vue     ← 侧边栏→底部Tab，卡片→2列

第2批（中频页）：
├── white-bg.vue / retouch.vue / video.vue
├── batch.vue / color-change.vue / virtual-tryon.vue

移动端布局规则：
- 侧边栏 → 底部 TabBar（首页/工具/作品/我的）
- 卡片网格 → 2列 → 1列（<375px）
- 大输入框 → 全宽，键盘上推
- 上传区 → 全屏拖拽
- Vant UI 组件替换 Element Plus（按需引入）
```

---

## 4. 智能项速览

| # | 项目 | 方案 |
|---|------|------|
| **意图路由** | `server/src/services/intentRouter.js`：解析用户输入文本 → 匹配功能 → 返回推荐路由 + 自动填参 |
| **提示词补全** | `server/src/services/promptEnhancer.js`：输入"白底" → 自动补全分辨率/光照/风格/背景色参数 |
| **异常自愈** | ModelAdapter 层：第1次失败换模型 → 第2次降级参数 → 第3次返回友好提示 |
| **规则巡检** | ✅ 已通过 MEMORY.md 每15-20轮自检实现 |

---

## 📋 文档补全（配套）

| 文档 | 状态 | 内容 |
|------|:--:|------|
| `CLAUDE.md` | ✅ | 19章AI行为规则书（400+行） |
| `README.md` | ❌ | 项目概述+快速启动+技术栈+目录结构+功能矩阵 |
| `CHANGELOG.md` | ❌ | 版本变更记录 |
| `CONTRIBUTING.md` | ❌ | 代码规范+PR流程+审查清单 |
| `docs/API.md` | ❌ | Swagger JSON → 可读 Markdown 接口文档 |
| `docs/ARCHITECTURE.md` | ❌ | 架构图+分层说明+模块依赖关系 |
| `docs/DEPLOY.md` | ❌ | 部署手册：Docker/PM2/Nginx/SSL |
| `docs/FAQ.md` | ❌ | 常见问题+故障排查 |

---

## 工作量估算

| 阶段 | 内容 | 人天 | 累计 |
|------|------|------|------|
| 🔴 P0 | 技术底座（API Key + BullMQ + Vitest + Redis + 迁移工具 + 日志 + 降级） | 12 | 12 |
| 🟡 P1 | 产品运营（新手引导 + 搜索 + 空状态 + 收藏夹 + 分享 + 仪表盘 + 额度 + 埋点 + 模板市场 + SEO） | 14 | 26 |
| 🟢 P2 | UI + 智能（骨架屏 + 进度条 + 移动端 + 意图路由 + 提示词补全 + 异常自愈） | 10 | 36 |
| 📋 文档 | 8 份文档 | 4 | 40 |
| **合计** | **28 项** | **40 人天** | — |

---

## 前置条件（需用户提供/确认）

1. **OpenAI API Key**（或 Claude/其他模型 Key）
2. **微信支付/支付宝商户号**（如需真实支付）
3. **项目目录是否迁移到 ASCII 路径**（解决 vitest 问题）
4. **确认执行优先级**：全部执行 / 只做 P0 / 自定义选择

---

*文档版本 v1.0 | 2026-05-07 | Movio AI 完善方案*
