# Movio AI — 多模型架构完整方案

> G1 架构规划组 | Architect 输出 | 2026-05-08
> 状态：方案对齐阶段，暂不启动开发

---

## 一、现状盘点

### 1.1 已有基础设施

| 模块 | 文件 | 能力 | 成熟度 |
|------|------|------|:--:|
| AI 引擎核心 | `aiEngine.js` | 模型注册/发现、任务→模型映射、降级链、统一 `infer()`、多阶段 `pipeline()`、健康检查、用量统计、结果缓存 | 🟢 高 |
| 模型路由中台 | `model-router.service.js` | 三种模式（single/mixed/custom）、熔断器集成、负载均衡、模型状态上报 | 🟢 高 |
| 适配器层 | `adapters/` 6 个 | OpenAI(GPT-4o/DALL-E)、Claude(Sonnet/Haiku)、SD(WebUI/ComfyUI)、通义万象、Seedance、千问 | 🟡 中 |
| 熔断器 | `circuit-breaker.js` | 失败计数/熔断/半开试探/冷却恢复 | 🟢 高 |
| AI 调用器 | `ai-caller.js` | 统一 HTTP 调用/重试/超时 | 🟢 高 |
| 消息队列 | `queueManager.js` | BullMQ 四队列（image/video/batch/notification） | 🟢 高 |
| AI 日志 | `aiLogService.js` | 调用记录/耗时/状态 | 🟡 中 |

### 1.2 已实现的三种模式（model-router.service.js）

```
single 模式：用户指定模型 → 直接调用
mixed  模式：系统按 task_type 查 TASK_MODEL_MAP → 自动选模型
custom 模式：用户传模型列表 → 取第一个健康 → 调用；全故障降级到 mixed
```

### 1.3 关键缺口

| 缺口 | 详细说明 |
|------|------|
| **两套系统并行未统一** | `aiEngine.js` 和 `model-router.service.js` 功能重叠（各自有注册中心、各自有路由逻辑），未整合 |
| **无模型分类管理层** | 模型有 `type` 字段但无文本/图片/视频三大类的正式分类 API、分类策略、分类配额 |
| **混合模式过于简单** | `TASK_MODEL_MAP` 只映射到单一模型类型，不能一次任务自动调用多个不同类别模型协同处理 |
| **自定义模式缺少排序/优先级** | 用户只能传模型列表，取第一个可用；不能调序、不能配优先级权重、不能设执行策略（串行/并行） |
| **无多模型结果聚合** | 多个模型同时调用后，无法自动整合/对比/择优返回 |
| **接入新模型需改代码** | 每次加模型要写 Adapter + 注册 + 改 TASK_MODEL_MAP，无法从管理后台配置上线 |
| **无模型 A/B 对照** | 同一任务无法同时发两个模型对比质量，无法基于数据选最优模型 |
| **无成本归属** | 有用量统计但无按模型/租户/任务类型的费用核算 |

---

## 二、目标架构总览

### 2.1 统一分层

```
┌─────────────────────────────────────────────────────────┐
│  前端层：模型选择器 UI / 混合配置面板 / 用量仪表盘        │
├─────────────────────────────────────────────────────────┤
│  API 网关层：POST /api/ai/dispatch  统一调度入口          │
├─────────────────────────────────────────────────────────┤
│  调度编排层（核心新建，整合 aiEngine + model-router）      │
│  ┌──────────┬──────────────┬──────────────┬──────────┐  │
│  │ 模式解析器 │ 任务分析器    │ 模型匹配引擎  │ 结果聚合器 │  │
│  │ ModeParser│ TaskAnalyzer │ ModelMatcher │ ResultMgr │  │
│  └──────────┴──────────────┴──────────────┴──────────┘  │
├─────────────────────────────────────────────────────────┤
│  模型管理中间层                                           │
│  ┌──────────┬──────────────┬──────────────┐            │
│  │ 模型注册中心│ 分类管理器    │ 配额/成本追踪 │            │
│  │ Registry  │ CategoryMgr  │ CostTracker  │            │
│  └──────────┴──────────────┴──────────────┘            │
├─────────────────────────────────────────────────────────┤
│  适配器层（每模型一个 Adapter，统一接口）                   │
│  文本：GPT-4o | Claude | 千问 | ...                      │
│  图片：DALL-E3 | SD | 通义万象 | ...                     │
│  视频：Seedance | Runway | Pika | ...                    │
├─────────────────────────────────────────────────────────┤
│  基础设施层：熔断器 | 消息队列 | 结果缓存 | AI 调用日志     │
└─────────────────────────────────────────────────────────┘
```

### 2.2 整合策略：废弃 model-router.service.js

`model-router.service.js` 的 single/mixed/custom 三个函数合并进 `aiEngine.js` v3.0，统一入口统一逻辑，消除双轨。

---

## 三、核心架构模块设计

### 3.1 模型分类管理器 `CategoryManager`

**职责**：按三大类（文本/图片/视频）管理模型，提供分类查询、分类配额、分类健康统计。

```
CategoryManager {
  TEXT:   ['gpt-4o', 'claude-sonnet-4-6', 'qwen-turbo', 'gpt-4o-mini', 'claude-haiku-4-5']
  IMAGE:  ['dalle3', 'sd-xl', 'tongyi-wanxiang', 'rmbg-2.0', 'iclight-v2']
  VIDEO:  ['seedance-2.0', 'pixeldance', 'runway-gen3', 'pika-2.0']

  getModelsByCategory(category) → string[]
  getCategoryOfModel(modelId) → string
  getCategoryHealth(category) → { total, healthy, degraded }
  getAllCategories() → ['text', 'image', 'video']
}
```

### 3.2 统一调度入口 `POST /api/ai/dispatch`

**单一端点，三种模式通过 `mode` 参数区分，零歧义：**

```json
// 模式一：自动匹配混合
{
  "mode": "auto",
  "taskType": "product_video_ad",
  "input": { "productName": "...", "images": [...], "platform": "tiktok" }
}

// 模式二：自定义混合
{
  "mode": "custom",
  "taskType": "product_video_ad",
  "input": { ... },
  "pipeline": {
    "text": { "modelId": "gpt-4o", "priority": 1 },
    "image": { "modelId": "dalle3", "priority": 2 },
    "video": { "modelId": "seedance-2.0", "priority": 3 }
  },
  "strategy": "serial"   // "serial" | "parallel"
}

// 模式三：单模型独立
{
  "mode": "single",
  "modelId": "gpt-4o",
  "input": { "prompt": "..." }
}
```

### 3.3 模式解析器 `ModeParser`

**职责**：解析请求中的 mode 字段，校验参数合法性，路由到对应处理器。

```
ModeParser.parse(request) → { valid, mode, normalizedParams, errors }
  ├─ mode=single  → 校验 modelId 存在 + 健康 → SingleHandler
  ├─ mode=auto    → 校验 taskType 合法 → AutoMatchHandler
  └─ mode=custom  → 校验 pipeline 配置合法 + 至少1个模型健康 → CustomHandler
```

### 3.4 任务分析器 `TaskAnalyzer`

**职责**（auto 模式核心）：根据 taskType 推断需要哪些类别的模型、各类别需要做什么子任务、子任务间的依赖关系。

```
TaskAnalyzer.analyze(taskType) → {
  requiredCategories: ['text', 'image', 'video'],  // 需要哪几类模型
  subTasks: [
    { id: 'script',  category: 'text',  action: 'generate_script',  dependsOn: [] },
    { id: 'poster',  category: 'image', action: 'generate_poster',  dependsOn: ['image_input'] },
    { id: 'video',   category: 'video', action: 'compose_video',    dependsOn: ['poster'] },
  ],
  dependencies: { video: ['poster'], poster: [] },
  strategy: 'serial',  // 推荐执行策略
}
```

### 3.5 模型匹配引擎 `ModelMatcher`

**职责**（auto 模式核心）：对每个子任务，从对应类别中自动选出最合适的模型。匹配维度：

| 维度 | 权重 | 说明 |
|------|:--:|------|
| 任务匹配度 | 40% | 该模型是否有该子任务的处理能力 |
| 当前健康状态 | 25% | 熔断器状态 + 响应延迟 |
| 历史成功率 | 20% | 该模型执行此类任务的历史成功/失败比 |
| 成本优先级 | 10% | 租户套餐决定优先用便宜还是贵的模型 |
| 并发负载 | 5% | 当前排队任务数 |

```
ModelMatcher.match(subTask, category, tenantTier) → {
  primary: 'gpt-4o',       // 首选模型
  fallback: ['claude-sonnet-4-6', 'qwen-turbo'],  // 降级链
  score: 0.87,             // 匹配得分
  reason: '历史成功率94% + 健康 + 成本适配套餐'
}
```

### 3.6 结果聚合器 `ResultAggregator`

**职责**：多模型/多子任务完成后，整合结果、去重、择优、格式化输出。

```
ResultAggregator.aggregate(subTaskResults, strategy) → {
  status: 'success' | 'partial' | 'failed',
  results: {
    script: { modelId: 'gpt-4o', output: {...}, elapsed: 1200 },
    poster: { modelId: 'dalle3', output: {...}, elapsed: 3400 },
    video:  { modelId: 'seedance-2.0', output: {...}, elapsed: 28000 },
  },
  summary: {
    totalElapsed: 32600,
    modelsUsed: ['gpt-4o', 'dalle3', 'seedance-2.0'],
    fallbackTriggered: false,
    estimatedCost: 0.42,  // USD
  },
  artifacts: {
    videoUrl: 'https://...',
    posterUrl: 'https://...',
    script: '...',
  },
}
```

### 3.7 模型配置管理中心 `ModelConfigManager`

**职责**：模型元数据持久化到 MySQL `ai_models` 表，管理后台可 CRUD。

```sql
CREATE TABLE ai_models (
  id            VARCHAR(64) PRIMARY KEY,
  name          VARCHAR(128) NOT NULL,
  category      ENUM('text','image','video') NOT NULL,
  provider      VARCHAR(64) NOT NULL,
  endpoint      VARCHAR(512),
  api_key_env   VARCHAR(128) COMMENT '.env 中的 key 名',
  capabilities  JSON COMMENT '["script_gen","image_gen","video_gen"]',
  config        JSON COMMENT '{"maxTokens":4096,"temperature":0.7}',
  priority      INT DEFAULT 0,
  is_active     TINYINT(1) DEFAULT 1,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME ON UPDATE CURRENT_TIMESTAMP
);
```

**效果**：新增模型 = 管理后台填一行配置 + 设 API Key = 上线。**不需要改代码。**

---

## 四、三种使用模式 — 技术实现逻辑

### 4.1 模式一：自动匹配混合（auto）

**流程**：

```
POST /api/ai/dispatch { mode:"auto", taskType:"product_video_ad", input }
  ↓
1. ModeParser → 识别为 auto 模式
  ↓
2. TaskAnalyzer.analyze("product_video_ad")
   → 拆解为 3 个子任务：[script(text), poster(image), video(video)]
   → 依赖关系：poster 不依赖 script，video 依赖 poster
  ↓
3. ModelMatcher 逐个子任务匹配
   → script → gpt-4o (得分 0.87)
   → poster → dalle3 (得分 0.92)
   → video  → seedance-2.0 (得分 0.85)
  ↓
4. 按依赖关系调度执行（parallel where possible）
   ├─ script 和 poster 可并行（无依赖）
   └─ video 等 poster 完成后再执行
  ↓
5. ResultAggregator 整合 → 返回统一结构
```

**自动推荐理由透明化**：响应中附带 `matchLog`，说明为什么选这些模型：

```json
{
  "matchLog": [
    { "subTask": "script", "selected": "gpt-4o", "reason": "历史成功率94%，响应<1.5s，成本适配当前套餐" },
    { "subTask": "poster", "selected": "dalle3", "reason": "电商场景匹配度92%，图像质量评分最高" },
    { "subTask": "video",  "selected": "seedance-2.0", "reason": "唯一支持9:16比例+中文文案叠加的视频模型" }
  ]
}
```

### 4.2 模式二：自定义混合（custom）

**流程**：

```
POST /api/ai/dispatch { mode:"custom", pipeline:{...}, strategy, input }
  ↓
1. ModeParser → 校验 pipeline 配置
   → text.modelId="gpt-4o" ✓
   → image.modelId="dalle3" ✓
   → video.modelId="seedance-2.0" ✓
  ↓
2. 按用户指定的 priority 确定执行顺序
   → text(priority=1) → image(priority=2) → video(priority=3)
  ↓
3. 按 strategy 决定执行方式
   → strategy=serial   → 严格串行，前一个完成下一个开始
   → strategy=parallel → 无依赖的并发执行
  ↓
4. 每步执行走统一 infer() 管道（重试→降级→缓存）
  ↓
5. ResultAggregator 整合 → 返回
```

**自定义混合的灵活性设计**：

```json
// 用户可配置的维度
{
  "pipeline": {
    "text": {
      "modelId": "gpt-4o",
      "priority": 1,
      "overrides": { "temperature": 0.9, "maxTokens": 3000 }  // 可覆写模型参数
    },
    "image": {
      "modelId": "sd-xl",
      "priority": 2,
      "fallback": ["dalle3"]   // 用户可自定义降级链
    }
  },
  "strategy": "parallel",       // serial | parallel
  "mergePolicy": "latest",      // latest | manual_compare | best_scored
  "onFailure": "continue"       // continue(部分成功也返回) | abort(任一失败全停)
}
```

### 4.3 模式三：单模型独立（single）

**流程最简，直接走已有 `infer()` 管道**：

```
POST /api/ai/dispatch { mode:"single", modelId:"gpt-4o", input }
  ↓
1. ModeParser → modelId 存在 + 健康 → 放行
  ↓
2. aiEngine.infer("gpt-4o", input)
   → 重试(3次) → 降级(gpt-4o-mini → claude-sonnet) → 缓存 → 返回
  ↓
3. 直接返回结果（无需 ResultAggregator）
```

**与现有 infer() 完全兼容**，不重复造轮子。

---

## 五、统一接口封装设计

### 5.1 单一入口端点

```
POST /api/ai/dispatch
```

### 5.2 请求 Schema（Zod）

```typescript
const DispatchRequest = z.object({
  mode: z.enum(['single', 'auto', 'custom']),
  
  // single 模式
  modelId: z.string().optional(),
  
  // auto 模式
  taskType: z.string().optional(),
  
  // custom 模式
  pipeline: z.record(z.object({
    modelId: z.string(),
    priority: z.number().int().min(1).max(100),
    overrides: z.record(z.any()).optional(),
    fallback: z.array(z.string()).optional(),
  })).optional(),
  strategy: z.enum(['serial', 'parallel']).optional(),
  mergePolicy: z.enum(['latest', 'manual_compare', 'best_scored']).optional(),
  onFailure: z.enum(['continue', 'abort']).optional(),
  
  // 通用
  input: z.record(z.any()),
  skipCache: z.boolean().optional(),
  webhook: z.string().url().optional(),  // 异步任务完成回调
});
```

### 5.3 响应 Schema

```typescript
const DispatchResponse = z.object({
  success: z.boolean(),
  mode: z.enum(['single', 'auto', 'custom']),
  
  // 同步完成时
  results: z.record(z.object({
    modelId: z.string(),
    category: z.enum(['text', 'image', 'video']),
    output: z.any(),
    elapsed: z.number(),
    degraded: z.boolean(),
  })).optional(),
  
  // 异步任务时
  taskId: z.string().optional(),
  statusUrl: z.string().optional(),
  
  // 聚合信息
  summary: z.object({
    totalElapsed: z.number(),
    modelsUsed: z.array(z.string()),
    fallbackTriggered: z.boolean(),
    estimatedCost: z.number(),
  }).optional(),
  
  // 匹配日志（auto 模式）
  matchLog: z.array(z.object({
    subTask: z.string(),
    selected: z.string(),
    reason: z.string(),
  })).optional(),
});
```

### 5.4 管理端点

| 端点 | 说明 |
|------|------|
| `GET /api/admin/models` | 模型列表 + 状态 |
| `POST /api/admin/models` | 新增模型（管理后台→DB→热加载） |
| `PUT /api/admin/models/:id` | 更新模型配置 |
| `DELETE /api/admin/models/:id` | 下线模型 |
| `POST /api/admin/models/:id/reset-breaker` | 重置熔断器 |
| `GET /api/admin/models/health` | 全模型健康检查 |
| `GET /api/admin/models/cost-stats` | 按模型/租户/任务类型的成本统计 |

---

## 六、低成本接入与无感知切换机制

### 6.1 新增模型：三步上线，零改代码

```
第1步：管理后台 → "新增模型" → 填：
  - 名称：Seedance 3.0
  - 类别：video
  - 供应商：ByteDance
  - API Key：sk-xxxx（加密存储到 .env）
  - 能力：["video_gen", "action_migrate"]

第2步：服务端后台热加载 → 写入 ai_models 表 +
       注册到 aiEngine.registry → 即刻生效

第3步：auto 模式自动发现新模型 → ModelMatcher 纳入匹配池 →
       下次任务自动考虑该模型
```

### 6.2 替换模型：无感知切换

```
场景：dalle3 涨价，想切到 tongyi-wanxiang

第1步：管理后台 → 把 dalle3 的 is_active 设为 0
第2步：ModelMatcher 下一次匹配时自动跳过 is_active=0 的模型
第3步：正在执行中的 dalle3 任务不受影响（优雅下线）
第4步：新的图片任务自动匹配到 tongyi-wanxiang
第5步：用户零感知，auto 模式自动适配
```

### 6.3 热加载机制

```
MySQL ai_models 表变更
  ↓
ModelConfigManager 检测到变更（轮询 30s / 或管理后台手动触发刷新）
  ↓
对比 registry 差异 → 新增/更新/移除 → 通知 ModelMatcher 刷新匹配索引
  ↓
WebSocket 广播 admin 端"模型配置已更新"
```

---

## 七、整体架构优势

| 优势 | 说明 |
|------|------|
| **统一单入口** | `POST /api/ai/dispatch` 覆盖所有场景，前端只需记住一个端点 |
| **三模式覆盖全场景** | auto(免配置) + custom(灵活) + single(简单) 互相独立又互备降级 |
| **模型分类管理** | 文本/图片/视频三大类，ModelMatcher 只在同类内匹配，防止"用文本模型生成图片" |
| **配置驱动接入** | 新增模型 = 管理后台填表 = 上线，Adapters 只需对新型号供应商写一次 |
| **透明化推荐** | matchLog 把黑盒匹配变白盒，用户可理解、可质疑、可纠偏 |
| **多级降级保护** | 模型级降级 → 类别级降级 → 全局 fallback，不会因一个模型挂了返回 500 |
| **成本可追溯** | 每次调用记录 modelId + elapsed + token数 + 估算费用，按租户/任务聚合 |
| **沿用现有基建** | 整合 aiEngine + model-router，熔断器/队列/缓存/日志全部复用 |

## 八、潜在风险与优化建议

| 风险 | 影响 | 缓解措施 |
|------|------|------|
| **模型 API 不稳定** | 调度频繁触发降级 | 熔断器已就位；建议加模型质量评分自动降权 |
| **auto 匹配不准** | 用户对自动选的模型不满意 | matchLog 透明化 + 支持用户纠偏反馈，优化匹配权重 |
| **多模型并发成本高** | 一次 auto 任务调用 3 个模型，费用叠加 | 租户套餐限次 + 费用预估前置展示 + 消费确认 |
| **custom 配置复杂度** | 用户不知道该怎么组合模型 | 提供预设模板（如"电商带货模板"一键填充 pipeline） |
| **新模型 Adapter 开发成本** | 每个新供应商要写一个 Adapter | 通用 OpenAI-compatible Adapter 已覆盖 80% 情况（主流模型 API 都兼容 OpenAI 格式） |
| **两套系统整合风险** | aiEngine + model-router 合并可能引入回归 | 整合前先写兼容层，保留旧接口 2 个迭代再下线 |

---

## 九、新增优化模块

> 以下 8 项为第一版方案基础上的增量优化，按价值优先级排序

### 9.1 智能成本路由器 `CostRouter`

**问题**：一个简单文案（"写个标题"）和复杂文案（"写 3000 字详情页"）消耗差异巨大，但不做区分都调同一模型。

**方案**：任务复杂度预判 → 自动降级路由。

```
CostRouter.evaluate(prompt) → complexity: low | medium | high

low    (≤50字、单指令)   → 路由到便宜模型  gpt-4o-mini / claude-haiku-4-5
medium (50-500字、多指令) → 路由到标准模型  gpt-4o / claude-sonnet-4-6  
high   (≥500字、复杂逻辑) → 路由到最强模型  gpt-4o + thinking mode

效果：预计节省 30-50% API 费用，简单任务不浪费高端模型
```

### 9.2 语义缓存 `SemanticCache`

**问题**：现有缓存是精确匹配（exact match），"写一个红色连衣裙的详情页"和"写一个红色裙子详情页"两句话意思一样，但缓存不命中。

**方案**：文本类请求先过嵌入向量 → 余弦相似度 ≥0.95 → 直接返回缓存。

```
输入 prompt → embedding(本地小模型 text-embedding-3-small)
  → 与缓存中的所有 prompt embedding 做余弦相似度对比
  → 相似度 ≥0.95 → 命中 → 返回缓存结果
  → 相似度 <0.95 → 未命中 → 实际调用 → 结果写入缓存
```

### 9.3 多模型集成投票 `ModelEnsemble`

**问题**：合规审核、内容安全判断这类高敏感任务，单模型误判代价高。

**方案**：并行调 3 个模型 → 投票/取最严判定。

```
POST /api/ai/dispatch { mode:"ensemble", taskType:"compliance_check", input }
  ↓
并行调用: gpt-4o + claude-sonnet-4-6 + qwen-turbo
  ↓
策略:
  - vote_majority:  少数服从多数（安全判断）
  - vote_unanimous: 全票才通过  （合规红线）
  - best_of_n:      取质量得分最高的（文案创作）
  ↓
返回: { verdict, confidence, votes:[...] }
```

### 9.4 模型金丝雀发布 `CanaryDeployer`

**问题**：新模型上线可能不稳定，直接全量切换风险高。

**方案**：渐进式放量，自动监控回滚。

```
新模型 seedance-3.0 上线:
  Day1: 5% 流量 → 监控成功率/延迟/成本
  Day2: 25% 流量（成功率≥95% 自动放量）
  Day3: 50% 流量
  Day4: 100% 流量（如任意时段成功率<90% → 自动回滚到 seedance-2.0）
```

### 9.5 SSE 流式输出 `StreamingManager`

**问题**：文本生成（GPT/Claude）等待 3-5 秒才返回，用户体验差。

**方案**：文本类模型支持 SSE（Server-Sent Events），token 级别实时推送。

```
POST /api/ai/dispatch { mode:"single", modelId:"gpt-4o", streaming: true }
  ↓
SSE 事件流:
  data: {"token":"这件"} → data:{"token":"红色"} → data:{"token":"连衣裙"} → ...
  data: [DONE]
```

### 9.6 租户级模型权限 `TenantModelACL`

**问题**：免费用户和付费用户看到的模型池应该不同。

**方案**：套餐 → 模型白名单，在 ModelMatcher 匹配阶段就过滤。

```
ai_models 表新增字段: min_tier ENUM('free','pro','enterprise')

free 套餐   → 只能用 gpt-4o-mini + sd-basic + seedance-lite
pro 套餐    → 可用 gpt-4o + dalle3 + seedance-2.0
enterprise  → 全部模型 + 可自定义接入私有模型
```

### 9.7 提示词模板引擎 `PromptTemplateEngine`

**问题**：同一个"写商品标题"任务，GPT-4o 的最佳 prompt 和 Claude 的最佳 prompt 写法不同，当前硬编码在 Adapter 里。

**方案**：模板集中管理，按模型自动适配。

```
PromptTemplateEngine.resolve(taskType, modelId)
  → GPT-4o:    "你是一个专业电商文案。请为{product}写{count}个标题，要求..."
  → Claude:    "Human: 你是资深电商文案。任务：为以下商品创作{count}个标题。\n商品：{product}\nAssistant:"
  → Qwen:      "请用中文为电商商品「{product}」生成{count}个吸引人的标题。要求..."

每新增模型 → 只需配一套模板 → 不需要改 Adapter 代码
```

### 9.8 预算熔断器 `BudgetBreaker`

**问题**：用户一个月用完配额不知道，继续调用产生超额费用。

**方案**：租户+模型维度预算上限，超限自动熔断。

```
BudgetBreaker 检查点（每次 infer 前）:
  ├─ 租户月预算: $500 → 已用 $480 → 放行
  ├─ 单模型日预算: $50 → 已用 $48 → 放行
  └─ 单任务预算: $5 → 预估 $2 → 放行

超限 → 返回 402 Payment Required + "本月 {category} 模型用量已用完，请升级套餐"
```

---

## 十、优化后完整分层架构

```
┌──────────────────────────────────────────────────────────────┐
│  POST /api/ai/dispatch  统一调度入口                          │
├──────────────────────────────────────────────────────────────┤
│  调度编排层                                                   │
│  ModeParser → TaskAnalyzer → ModelMatcher → ResultAggregator  │
│  + CostRouter(复杂→便宜) + ModelEnsemble(投票) + Streaming    │
├──────────────────────────────────────────────────────────────┤
│  模型管理中间层                                                │
│  Registry + CategoryMgr + CostTracker + TenantModelACL        │
│  + PromptTemplateEngine + BudgetBreaker                       │
├──────────────────────────────────────────────────────────────┤
│  智能缓存层：SemanticCache(语义) + ExactCache(精确)            │
├──────────────────────────────────────────────────────────────┤
│  模型生命周期：CanaryDeployer(金丝雀) + HotReload(热加载)      │
├──────────────────────────────────────────────────────────────┤
│  适配器层：文本(GPT-4o/Claude/Qwen) | 图片(DALL-E/SD/万象)    │
│            | 视频(Seedance/Runway/Pika)                       │
├──────────────────────────────────────────────────────────────┤
│  基础设施：熔断器 | BullMQ | AI Logger | SSE推送              │
└──────────────────────────────────────────────────────────────┘
```

---

## 十一、整合路线图（更新）

```
Phase 1 (2天)：统一整合
  ├─ aiEngine.js v3.0 — 合并 model-router.service.js
  ├─ CategoryManager — 三大类模型管理
  ├─ ModelConfigManager — ai_models 表 + 热加载
  └─ POST /api/ai/dispatch — 统一调度入口

Phase 2 (2天)：增强三种模式
  ├─ TaskAnalyzer — taskType → 子任务拆解
  ├─ ModelMatcher — 五维评分匹配引擎
  ├─ ResultAggregator — 多结果聚合
  └─ Custom mode — 排序/优先级/策略增强

Phase 3 (2天)：质量与稳定性
  ├─ CostRouter — 智能成本路由（省钱）
  ├─ SemanticCache — 语义缓存（省调用）
  ├─ ModelEnsemble — 多模型投票（安全）
  └─ CanaryDeployer — 金丝雀发布（稳上线）

Phase 4 (1.5天)：运营与体验
  ├─ StreamingManager — SSE 流式输出
  ├─ TenantModelACL — 租户权限隔离
  ├─ PromptTemplateEngine — 模板引擎
  ├─ BudgetBreaker — 预算熔断
  └─ 管理后台 CRUD + 仪表盘 + 预设模板

总计：7.5 天
```

---

## 十二、总结

### 第一版方案（已就绪）
整合现有 `aiEngine` + `model-router` 为统一入口，三大类模型管理，三种模式全覆盖，配置式接入。

### 第二版方案（本次新增 8 项优化）

| # | 模块 | 一句话 | 解决什么 |
|:--:|------|------|------|
| 1 | `CostRouter` | 简单任务用便宜模型 | 省 30-50% API 费用 |
| 2 | `SemanticCache` | 语义相似即命中缓存 | 减少 20-30% 重复调用 |
| 3 | `ModelEnsemble` | 3 模型并行投票 | 合规判断零误判 |
| 4 | `CanaryDeployer` | 5%→25%→50%→100% 渐进上线 | 新模型零事故 |
| 5 | `StreamingManager` | SSE token 级实时推送 | 文本生成体验提升 |
| 6 | `TenantModelACL` | 套餐→模型白名单 | 免费/付费能力隔离 |
| 7 | `PromptTemplateEngine` | 同任务多模型 prompt 自动适配 | 新模型接入免写 prompt |
| 8 | `BudgetBreaker` | 超预算自动熔断 | 杜绝超额账单 |

### 对比

| 维度 | 第一版 | 第二版（优化后） |
|------|:--:|:--:|
| 核心模块 | 7 个 | **15 个** |
| 三种模式 | auto/custom/single | + ensemble |
| 缓存 | 精确匹配 | 精确 + 语义双层 |
| 成本控制 | 统计 | 统计 + 路由 + 熔断 |
| 用户体验 | 请求-响应 | + SSE 流式 |
| 安全 | 熔断器 | 熔断器 + ACL + 预算熔断 |
| 上线风险 | 直接全量 | 金丝雀渐进 |
| 开发人天 | 5 天 | **7.5 天** |
| 基建复用率 | ~80% | **~75%**（新增模块部分新写） |
