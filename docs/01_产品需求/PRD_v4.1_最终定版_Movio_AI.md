# Movio AI 电商智能体助手 — PRD v4.1 最终定版

> **旧版 v1.0 / v2.0 / v3.0 / v4.0 全部作废，本文档为唯一开发依据**
> 2026-05-08 定版 v4.1 | G2 项目统筹 | G1 架构终审 | 三轮共 36 条建议全部吸纳

---

## 一、产品概要

| 项 | 值 |
|:--|:--|
| 产品名 | **Movio AI 电商智能体助手** |
| 核心定位 | AI 图片处理 + AI 短视频创作 + 长视频录播智能精剪 + AI 数字人 |
| 目标用户 | 电商商家（商品主图/详情页/店铺素材）+ 达人/自媒体/带货博主（短视频创作/内容发布/多平台分发） |
| 商业模式 | 会员阶梯套餐 + 积分充值消费 + 分销裂变 |
| 底层架构 | 模块化微服务 + 模型中台调度层 + 全站配置化驱动 |

### 竞品差异化（五大独家王牌）

| 能力 | Photoroom | 美图设计室 | 青虎AI | **Movio AI** |
|:--|:--:|:--:|:--:|:--:|
| 批量动作迁移 | ❌ | ❌ | ❌ | **⭐唯一品类杀手** |
| 长视频智能精剪 | ❌ | ❌ | ❌ | **⭐直播回放刚需** |
| 多平台一键分发 | ❌ | ❌ | ❌ | **⭐25平台适配** |
| 剪映生态深度对接 | ❌ | ❌ | ❌ | **⭐最高ROI渠道** |
| 详情图套图一键生成 | ❌ | ⭐⭐ | ⭐ | **⭐电商刚需** |

---

## 二、系统架构总览

### 2.1 模块化微服务划分

```
Movio AI Platform
├── MSG-SCHEDULE  模型调度中台（单一/混合/自定义模型路由/负载均衡/异常降级）★ 新增独立
├── MSG-MEDIA     媒体生成服务（视频生成/图片生成/数字人渲染）
│   └── 子模块: 多平台适配引擎（画幅适配/格式转换/剪映对接/一键分发）★ 新增
├── MSG-MODERATION 内容风控服务（敏感词过滤/合规校验/生成内容审核）★ 新增独立
├── MSG-ACCOUNT   账号体系（注册登录/角色权限）
├── MSG-BILLING   商业化（会员套餐/积分充值/扣费记录）
├── MSG-DISTRIB   分销裂变（邀请码/上下级/返利/团队业绩）
├── MSG-PLATFORM  平台对接（店铺绑定/账号绑定/分发生态）
├── MSG-ASSET     素材资产（云端素材库/模板中心/草稿箱）
├── MSG-CONFIG    配置中心（全站文案/选项/模板/参数配置化）
├── MSG-SECURITY  安全认证（接口鉴权/加密/防刷）
└── MSG-COMMON    公共基础（文件上传/CDN/任务队列/日志/通知）
```

### 2.1.1 请求链路（由上至下）

```
用户请求
  │
  ▼
┌──────────────────────┐
│  MSG-SECURITY        │  ← 第1层: 安全认证（JWT 鉴权 + 角色权限 + 限流防刷）
└──────┬───────────────┘
       │ 通过
       ▼
┌──────────────────────┐
│  MSG-MODERATION      │  ← 第2层: 内容风控（敏感词/违规图片/合规校验）★ 新增
└──────┬───────────────┘
       │ 审核通过
       ▼
┌──────────────────────┐
│  业务服务层           │
│  ├─ MSG-MEDIA        │  ← 第3层: 视频/图片/数字人生成
│  ├─ MSG-ACCOUNT      │
│  ├─ MSG-BILLING      │
│  ├─ MSG-DISTRIB      │
│  ├─ MSG-PLATFORM     │
│  └─ MSG-ASSET        │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  MSG-SCHEDULE        │  ← 第4层: 模型调度中台（负载均衡 + 超时重试 + 降级）★ 独立
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  AI 模型适配器层      │
│  ├─ SeedanceAdapter   │
│  ├─ TongyiAdapter     │
│  ├─ QwenAdapter       │
│  ├─ DigitalHumanAdap  │
│  └─ CustomAdapter...  │
└──────────────────────┘
```

### 2.2 模型中台调度层

```
业务层（MSG-MEDIA/其他服务）
        │
        ▼
┌─────────────────────┐
│  ModelRouterService  │  ← 调度核心
├─────────────────────┤
│  调度模式选择        │
│  ├─ 单一模式: 指定模型直出           │
│  ├─ 混合模式: 按 task_type 自动选最优 │
│  └─ 自定义模式: 读取用户配置的模型列表 │
├─────────────────────┤
│  模型适配器注册表    │
│  ├─ SeedanceAdapter  (视频生成)       │
│  ├─ TongyiAdapter    (图片生成)       │
│  ├─ QwenAdapter      (文本/提示词)    │
│  ├─ DigitalHumanAdap (数字人)         │
│  ├─ CustomAdapter    (自定义接入...)  │
│  └─ ...                              │
├─────────────────────┤
│  统一接口            │
│  generate(prompt, params) → result   │
│  - 超时: 120s                        │
│  - 重试: max 3 次                    │
│  - 降级: 返回备用提示                 │
├─────────────────────┤
│  熔断器 (Circuit Breaker) ★ v4.1     │
│  - 健康检查: 每 30s ping /health     │
│  - 熔断: 连续失败 5 次 → 踢出 60s   │
│  - 半开试探: 冷却后发1个请求验证     │
│  - 可用池: 仅健康模型参与调度        │
└─────────────────────┘
```

**配置热更新推送 ★ v4.1**：

```
后台修改配置 → ConfigService 写入 → Redis 发布版本号
SSE/WebSocket → 前端 useAppConfig 检测版本变化 → 静默刷新
```

所有已打开页面的用户无需手动刷新即可看到最新文案。

### 2.3 异步任务队列

```
提交任务 → job_queue 表 → 返回 job_id
Worker 消费 → ModelRouter → 更新 progress → 写入 result
前端 useTaskPolling(jobId) 轮询 → 完成 → 展示/下载
```

MVP 阶段用 MySQL 轮询实现，Service 层预留 interface 方便后期切换到 Redis Queue / RabbitMQ。

### 2.4 配置化驱动架构

```
┌────────────────────┐
│   管理后台配置表单   │  运营编辑
└──────┬─────────────┘
       │ POST /api/admin/config
       ▼
┌────────────────────┐
│  ConfigService     │  写入 MySQL + 刷新 Redis 缓存
└──────┬─────────────┘
       │ GET /api/config/:group  (公开/需登录/管理员三级权限)
       ▼
┌────────────────────┐
│  useAppConfig()    │  前端 Composable (SSR useAsyncData 握手)
│  useAppDict()      │
│  useAppPage()      │
└──────┬─────────────┘
       │
       ▼
   所有页面/组件 动态渲染文案
```

五张核心配置表（详见第五章）：

| 表 | 用途 |
|:--|:--|
| `sys_config_group` | 配置命名空间分组 |
| `sys_config_item` | key-value 配置项 |
| `sys_config_log` | 变更版本快照（支持回滚） |
| `sys_dict_group` | 字典分组 |
| `sys_dict_item` | 下拉选项/分类 |
| `sys_template` | 提示词模板/消息模板（含变量占位符） |

### 2.5 内容风控中间件层 ★ 新增

放在安全认证层之后、业务服务层之前，作为所有 AI 生成内容的统一审核关口。

```
请求进入 → MSG-SECURITY 鉴权通过 → MSG-MODERATION 内容风控 → 业务层 → 模型调度
```

| 审核节点 | 审核内容 | 机制 | 处理方式 |
|:--|:--|:--|:--|
| **输入审核** | 用户提交的提示词/文案/图片/视频 | 敏感词库 + AI 审核模型 | 拦截/警告/放行 |
| **生成后审核** | AI 生成的图片/视频/字幕/文案 | 合规检测（色情/暴力/政治/侵权） | 拦截+标记/模糊处理/放行 |
| **分发前审核** | 最终分发到第三方平台的内容 | 平台规范合规校验 | 按目标平台规则逐条检查 |

**技术实现**：

```
// middleware/content-moderation.middleware.ts
export async function contentModeration(req, res, next) {
  const { type, content } = req.body

  // 1. 输入敏感词过滤
  const inputResult = await moderationService.checkInput({ type, content })
  if (inputResult.blocked) {
    return res.status(422).json({ code: 422, message: '内容包含违规信息', detail: inputResult.reason })
  }

  // 2. 挂载审核标记到请求，业务层生成后按标记执行后审
  req.moderation = { input_checked: true, risk_level: inputResult.riskLevel }
  next()
}
```

**数据库**：`content_audit_log` 表记录每一次审核结果，包含：
- `audit_type`（input/output/publish）
- `content_type`（text/image/video）
- `risk_level`（safe/warning/blocked）
- `audit_detail`（JSON，命中规则详情）
- `action`（pass/warn/block）

### 2.6 多平台适配子模块 ★ 新增

放在 MSG-MEDIA 和 MSG-PLATFORM 之间，作为视频/图片生成与多平台分发之间的独立解耦层。

```
┌──────────────────────────────────────────────┐
│              MSG-MEDIA 媒体生成               │
│  视频生成 / 图片生成 / 数字人 / 批量处理      │
└──────────────────┬───────────────────────────┘
                   │ 生成结果(原始格式)
                   ▼
┌──────────────────────────────────────────────┐
│         多平台适配子模块 ★ 新增                │
├──────────────────────────────────────────────┤
│  ┌─────────────┐ ┌──────────────┐ ┌────────┐ │
│  │ 画幅适配引擎 │ │ 格式转换引擎  │ │ 分发编排│ │
│  │ 16:9→9:16   │ │ MOV→MP4      │ │ 批量    │ │
│  │ 1:1→3:4     │ │ PNG→JPG      │ │ 队列    │ │
│  │ 智能裁剪     │ │ 码率/大小    │ │ 重试    │ │
│  └─────────────┘ └──────────────┘ └────────┘ │
│  ┌─────────────┐ ┌──────────────────────┐    │
│  │ 剪映生态引擎 │ │ 平台 API 适配器注册表│    │
│  │ 国内剪映对接 │ │ ├─ TaobaoAdapter    │    │
│  │ CapCut 对接  │ │ ├─ DouyinAdapter    │    │
│  │ 草稿导出    │ │ ├─ TikTokAdapter    │    │
│  │ 直接推送到   │ │ ├─ KuaishouAdapter  │    │
│  │ 剪映编辑页   │ │ ├─ ShopeeAdapter    │    │
│  └─────────────┘ │ └─ ...(25个平台)     │    │
│                  └──────────────────────┘    │
└──────────────────┬───────────────────────────┘
                   │ 适配后的素材 + 分发状态
                   ▼
┌──────────────────────────────────────────────┐
│              MSG-PLATFORM 平台对接            │
│    店铺绑定 / 账号绑定 / 分发记录 / 状态回调  │
└──────────────────────────────────────────────┘
```

**核心设计原则——与生成逻辑完全解耦**：

```typescript
// platform-adapter/base.adapter.ts
interface PlatformAdapter {
  platform: string
  // 画幅规则
  aspectRatio: { width: number; height: number }
  // 格式规则
  formatRules: { video?: string; image?: string; maxSize: number; maxDuration: number }
  // 审核预检（模拟目标平台规则）
  preAudit(content: MediaContent): AuditResult
  // 适配转换
  adapt(input: MediaContent): Promise<AdaptedContent>
  // 分发
  publish(content: AdaptedContent, auth: PlatformAuth): Promise<PublishResult>
}

// 新增平台只需实现 BaseAdapter + 后台配置注册，不动任何业务代码
```

**与剪映生态对接方式**（两种路径）：

| 路径 | 说明 | 使用场景 |
|:--|:--|:--|
| **剪映插件/AI 能力调用** | Movio 作为剪映的内容供给方，生成的视频直接出现在剪映素材库 | 用户在剪映里找素材 |
| **剪映草稿导出** | Movio 导出剪映兼容的草稿文件(.draft)，用户双击即可剪映打开编辑 | 用户想在剪映精调 |

> **G2 提醒**: 剪映 API 开放能力需技术调研确认接入方式，如果官方暂未开放需准备备选方案（导出剪映兼容格式）。

---

## 三、功能模块与优先级

### 3.1 分期总览

| 阶段 | 周期 | 模块 | 功能数 |
|:--|:--|:--|:--:|
| W1 基础 | 第1-3周 | 账号/上传/配置中心/工作台 | 8 |
| W2 图片 | 第4-6周 | 图片生成+电商详情图 | 8 |
| W3 视频 | 第7-10周 | 视频核心+配套功能 | 15 |
| W4 杀手+商业化 | 第11-14周 | 动作迁移+精剪+会员+分销+分发 | 12 |
| **Phase 1 合计** | **14周** | **全部模块** | **41项** |
| Phase 2 | 后续迭代 | 翻译/海报/封面/分销进阶 | 15项 |

### 3.2 Phase 1 — 第一阶段首发（41项）

#### M01 视频核心王牌（9项 P0+）

| # | 功能 | 需求描述 | 使用场景 | 优先级 |
|:--:|:--|:--|:--|:--:|
| 01 | **AI 数字人** | 上传人像/选择数字人形象，输入口播文案，生成数字人播报视频 | 商家做产品讲解、达人做口播短视频 | P0 |
| 02 | **动作迁移** | 上传源视频+目标角色，AI提取动作轨迹迁移到新角色 | 换人拍同款视频、服装换模特 | P0 |
| 03 | **批量动作迁移** | 批量上传多个源视频+多个角色，一次生成全部迁移结果 | 矩阵号批量产出、多产品线同时推广 | P0 |
| 04 | **爆款视频分析** | 输入/上传爆款视频链接，AI分析拍摄手法/节奏/BGM/文案结构 | 达人研究爆款套路、商家分析竞品 | P0 |
| 05 | **爆款视频复刻** | 基于分析结果+用户素材，自动生成同风格复刻视频 | 快速模仿爆款、降低创作门槛 | P0 |
| 06 | **商品广告一键成片** | 输入商品图片+文案，自动生成带字幕/配乐/转场的广告短视频 | 商家做商品广告、投放素材 | P0 |
| 07 | **视频分镜生成器** | 输入主题/文案，AI拆解分镜脚本+生成对应画面+拼接为视频预览 | 内容规划、拍摄前分镜设计 | P0 |
| 08 | **长视频智能精剪** | 上传长视频，AI自动识别高光/重点片段，输出精剪版 | 直播回放变精华片段、教程缩短 | P0 |
| 09 | **多平台一键分发** | 生成内容后选择目标平台，自动适配画幅/格式/大小，批量发布 | 矩阵号运营、多平台同步 | P0 |

#### M02 视频配套功能（7项 P1）

| # | 功能 | 需求描述 | 使用场景 | 优先级 |
|:--:|:--|:--|:--|:--:|
| 10 | 视频生成 | 输入文字描述/提示词，AI生成短视频（Seedance） | 无素材快速创作 | P0 |
| 11 | 视频提示词润色 | AI优化用户输入的视频提示词，自动补全场景/风格/运镜 | 小白用户写不出好提示词 | P0 |
| 12 | 单图生视频 | 上传一张静态图片，AI生成动态短视频 | 商品图变动态展示 | P0 |
| 13 | 多图合成视频 | 上传多张图片，按顺序合成带转场/BGM的短视频 | 产品展示合集、旅行回忆 | P0 |
| 14 | 视频自动包装 | 自动加字幕/配乐/贴纸/Logo/平台比例适配 | 生成后一键包装 | P0 |
| 15 | 角色人物替换 | 替换视频中的角色人物，保留原动作/场景 | 换模特、换IP角色 | P1 |
| 16 | 视频任务/作品管理 | 任务进度查询、作品列表、草稿箱自动保存 | 管理产出内容 | P0 |

#### M03 图片核心（5项 P1）

| # | 功能 | 需求描述 | 使用场景 | 优先级 |
|:--:|:--|:--|:--|:--:|
| 17 | 图像生成 | 输入提示词/参考图，AI生成电商场景图/产品图 | 商品场景展示图 | P0 |
| 18 | 图片提示词润色 | AI优化图片提示词，自动补全构图/光线/风格 | 小白写不出专业提示词 | P0 |
| 19 | 电商主图复刻 | 上传参考主图风格，输入产品图，生成同风格商品主图 | 保持店铺整体风格统一 | P0 |
| 20 | 批量生图 | 批量提交提示词/参考图，一次生成多张图片 | 大量产品需要处理 | P1 |
| 21 | 批量改图 | 批量上传图片，统一修改尺寸/水印/滤镜/风格 | 产品图批量优化 | P1 |
| 22 | 批量图片替换 | 批量替换图片中的指定元素（背景/文字/Logo） | 品牌统一化处理 | P1 |

#### M04 电商详情图（4项 P1）

| # | 功能 | 需求描述 | 使用场景 | 优先级 |
|:--:|:--|:--|:--|:--:|
| 23 | 详情图提示词润色 | AI优化详情图提示词 | 详情页素材准备 | P1 |
| 24 | 详情图复刻 | 参考竞品详情页布局/风格，生成同风格详情图 | 快速做出专业详情页 | P1 |
| 25 | 详情图套图生成 | 输入产品图+卖点文案，一键生成完整详情页套图 | 新品上架、详情页快速制作 | P0 |
| 26 | 统一提示词增强引擎 | <span style="color:#ef4444">合并所有"提示词润色"功能为1个通用服务，前端按场景切换润色策略</span> | 省60%开发量 | P0 |

#### M05 平台配套（6项 P1）

| # | 功能 | 需求描述 | 使用场景 | 优先级 |
|:--:|:--|:--|:--|:--:|
| 27 | 店铺绑定 | 电商商家绑定淘宝/京东/拼多多/Shopee/Lazada等店铺 | 商品主图/详情页素材制作 | P1 |
| 28 | 账号绑定 | 达人绑定抖音/快手/B站/TikTok/YouTube等社媒账号 | 内容创作与多平台分发 | P1 |
| 29 | 国内剪映生态对接 | 对接剪映开放能力，支持剪映直接导入/编辑 Movio 生成内容 | 降低工具切换成本 | P0 |
| 30 | 海外剪映(CapCut)对接 | 对接 CapCut 生态，海外达人无缝使用 | 跨境电商/出海达人 | P1 |
| 31 | 多平台画幅适配 | 自动转换图片/视频比例、格式、大小匹配各平台规范 | 一稿多发 | P0 |
| 32 | 多平台一键分发 | 选择目标平台，自动适配后批量发布 | 矩阵号运营 | P0 |

#### M06 商业化与分销（6项 P1）

| # | 功能 | 需求描述 | 使用场景 | 优先级 |
|:--:|:--|:--|:--|:--:|
| 33 | 会员阶梯套餐 | 免费/基础/专业/企业多层套餐，每层不同功能+积分额度 | 持续收入 | P0 |
| 34 | 积分充值消费 | 积分充值+按功能消耗扣减+扣费明细 | 按量付费 | P0 |
| 35 | 免费试用额度 | 新注册送体验额度，覆盖3大杀手功能（动作迁移/爆款复刻/长视频精剪） | 拉新转化 | P0 |
| 36 | 基础分销-邀请码 | 分销员专属邀请码，新用户通过邀请码注册自动绑定上下级 | 裂变拉新 | P1 |
| 37 | 基础分销-推广返利 | 下级消费按比例返利给上级，记录收益明细 | 激励推广 | P1 |
| 38 | 角色权限体系 | 超管/运营/付费会员/免费用户/分销商 五角色权限隔离 | 系统安全 | P0 |

#### M07 基础设施（4项 P0）

| # | 功能 | 需求描述 | 使用场景 | 优先级 |
|:--:|:--|:--|:--|:--:|
| 39 | 用户注册登录 | 手机号/邮箱注册、登录、密码重置 | 所有功能入口 | P0 |
| 40 | 文件上传基础服务 | 图片/视频上传、对象存储+COS/CDN加速 | 所有上传场景 | P0 |
| 41 | 可视化配置中心 | 后台 DIY 编辑全站文案/选项/模板/套餐参数，配置变更日志+回滚 | 运营自主运维 | P0 |
| 42 | 首页工作台 | 功能导航、用量概览、快捷入口、最近作品 | 用户使用起点 | P0 |

---

### 3.3 Phase 2 — 第二阶段迭代（15项，本期不开发）

| # | 功能 | 优先级 | 说明 |
|:--:|:--|:--:|:--|
| 43 | 视频语音翻译 | P2 | 视频语音 AI 翻译为目标语言 |
| 44 | 视频字幕翻译 | P2 | 字幕自动翻译 |
| 45 | 视频面容翻译 | P2 | 数字人口型/面部适配不同语言 |
| 46 | 产品营销海报 | P2 | 产品+卖点生成营销海报 |
| 47 | 节日海报 | P2 | 节日主题自动生成海报 |
| 48 | 活动宣传海报 | P2 | 活动主题宣传海报 |
| 49 | 私域运营海报 | P2 | 朋友圈/社群私域海报 |
| 50 | 小红书封面生成 | P2 | 小红书风格封面图 |
| 51 | 微信公众号封面生成 | P2 | 公众号首图/次图 |
| 52 | 分销等级体系 | P2 | 多级分销等级权益 |
| 53 | 团队业绩统计 | P2 | 下级团队业绩汇总 |
| 54 | 专属推广素材 | P2 | 给分销员提供推广海报/文案 |
| 55 | 提现功能 | P2 | 分销收益提现 |
| 56 | 裂变拉新活动 | P2 | 拼团/助力/裂变活动模板 |

### 3.4 验收标准 (Acceptance Criteria) ★ v4.1

每个功能必须满足 2-3 条可验证的验收条件：

| 功能类别 | 验收标准模板 |
|:--|:--|
| 生成类（视频/图片/数字人） | ① 输入有效参数后 60s 内返回 job_id ② 任务完成率 ≥ 95% ③ 结果可预览/下载 |
| 批量类 | ① 支持同时提交 ≥ 10 个任务 ② 进度条实时更新 ③ 全部完成/部分失败分别展示 |
| 分发类 | ① 选择 ≥ 2 个平台同时分发 ② 每个平台返回独立状态 ③ 失败平台可单独重试 |
| 配置类 | ① 后台修改后 3s 内前端渲染更新 ② 修改记录可追溯 ③ 支持一键回滚 |
| 商业化类 | ① 积分扣减与生成结果原子绑定 ② 余额不足时拒绝+提示 ③ 扣费流水可查 |
| 绑定类 | ① OAuth 授权流程完整 ② Token 过期自动刷新 ③ 解绑后数据不再同步 |

### 3.5 集成测试窗口 ★ v4.1

| 窗口 | 开发截止 | 集成测试 | 产出 |
|:--|:--|:--|:--|
| W1 基础 | 第3周周五 | 第3周最后 2 天 | 注册→登录→上传→配置中心→工作台全链路 |
| W2 图片 | 第6周周五 | 第6周最后 2 天 | 生成→批量→主图复刻→详情图套图全链路 |
| W3 视频 | 第10周周五 | 第10周最后 2 天 | 生成→数字人→分镜→广告成片→爆款全链路 |
| W4 杀手+商业化 | 第13周周五 | 第14周全两周 | 全量回归 + 动作迁移→分发→会员→分销联调 |

### 3.6 外部依赖确认清单 ★ v4.1 — W1 必须逐项核实

| # | 依赖项 | 确认内容 | 负责人 | 截止 |
|:--:|:--|:--|:--|:--:|
| 1 | 剪映开放 API | 是否开放内容导入/草稿格式/能力调用 | G5 | W1-3 |
| 2 | CapCut API | 海外版接入方式与国内版差异 | G5 | W1-3 |
| 3 | Seedance 视频模型 | API Key、配额、并发限制、单价 | G1+G5 | W1-2 |
| 4 | 通义万象 图片模型 | API Key、配额、生成规格、单价 | G1+G5 | W1-2 |
| 5 | 千问 文本模型 | API Key、Token 消耗、prompt 长度限制 | G1+G5 | W1-2 |
| 6 | 阿里云内容安全 | 文本/图片/视频审核 API 接入方式 | G5 | W1-3 |
| 7 | 阿里云 OSS + CDN | Bucket 创建、CDN 域名、上传 SDK | G5+G6 | W1-2 |
| 8 | MinIO 部署 | 私有部署方案 vs 阿里云 OSS 对比 | G6 | W1-2 |
| 9 | 各平台 OAuth | 抖音/淘宝/TikTok/Shopee 等 OAuth 申请 | G5 | W1-4 |
| 10 | 短信/邮件服务 | 注册验证码服务选型 | G5 | W1-2 |

### 3.7 内容风控模型选型 ★ v4.1

| 审核类型 | 方案 | 接入方式 |
|:--|:--|:--|
| 文本审核 | 阿里云内容安全 / 通义千问 moderation API | SDK 调用 → `content_audit_log` 记录 |
| 图片审核 | 阿里云绿网 / 腾讯云图片内容安全 | 上传文件 → 异步审核 → 回调 |
| 视频审核 | 截图帧采样(每5s一帧) + 图片审核流水线 | Job Queue 异步处理 |
| 敏感词库 | 内置基础词库 + 后台可配置自定义词 | `sys_dict` 存储，运营可增删 |

### 3.8 OAuth Token 管理规范 ★ v4.1

```
用户授权 → 平台返回 { access_token, refresh_token, expires_in }
  → platform_token 表 AES-256 加密存储
  → 分发前检查 expires_at，过期则自动 refresh_token 刷新
  → 刷新失败 → 通知用户重新授权
  → 用户可主动解绑，解绑后删除 token
```

```sql
CREATE TABLE platform_token (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  platform VARCHAR(32) NOT NULL,
  access_token TEXT NOT NULL COMMENT 'AES-256加密',
  refresh_token TEXT COMMENT 'AES-256加密',
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_platform (user_id, platform)
);
```

### 3.9 原子计费规范 ★ v4.1

积分扣减必须使用数据库行级锁 + 乐观锁，杜绝"生成成功未扣费"或"扣费未生成"：

```sql
-- 原子扣减：affected rows=0 则拒绝
UPDATE points_account
SET balance = balance - ?, updated_at = NOW()
WHERE user_id = ? AND balance >= ?;

-- 事务流程
BEGIN;
  1. 原子扣减积分
  2. 写入 points_transaction 流水
  3. 提交 job_queue 任务
COMMIT;
-- 任务失败 → 异步退还积分 + 退还流水记录
```

### 3.10 大文件分片上传规范 ★ v4.1

`AppMediaUpload` 组件必须支持：

| 特性 | 参数 |
|:--|:--|
| 分片大小 | 5MB/片 |
| 并发上传 | 最多 3 片并行 |
| 断点续传 | localStorage 记录已上传分片 hash |
| 进度反馈 | 片级进度 + 总体进度 |

```
上传流程:
 计算文件 SHA256 → 查询已上传分片 → 上传缺失分片 → 合并分片 → 返回 URL
```

---

## 四、角色权限矩阵

| 权限 | 超级管理员 | 运营编辑 | 付费会员 | 免费用户 | 分销商 |
|:--|:--:|:--:|:--:|:--:|:--:|
| 全后台管理 | ✅ | ❌ | ❌ | ❌ | ❌ |
| 配置中心（编辑） | ✅ | ✅ | ❌ | ❌ | ❌ |
| 配置中心（只读） | ✅ | ✅ | ✅ | ✅ | ✅ |
| 视频/图片生成 | ✅ | ✅ | ✅（额度内） | ✅（试用额度） | ❌ |
| 动作迁移 | ✅ | ✅ | ✅（额度内） | ✅（试用） | ❌ |
| 长视频精剪 | ✅ | ✅ | ✅（额度内） | ✅（试用） | ❌ |
| 多平台分发 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 用户管理 | ✅ | ❌ | ❌ | ❌ | ❌ |
| 分销后台 | ✅ | ✅ | ❌ | ❌ | ✅（只看自己） |
| 订单/扣费日志 | ✅ | ✅ | ❌ | ❌ | ❌ |
| 模型调度配置 | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 五、数据库设计概要

### 5.1 配置化核心表（5张）

```sql
-- 配置分组
CREATE TABLE sys_config_group (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_key VARCHAR(64) NOT NULL UNIQUE COMMENT 'eg: page.home.hero',
  group_name VARCHAR(128) NOT NULL,
  description VARCHAR(256) DEFAULT NULL,
  permission_level ENUM('public','login','admin') DEFAULT 'public',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 配置项
CREATE TABLE sys_config_item (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  config_key VARCHAR(64) NOT NULL COMMENT 'eg: title, btn_text',
  config_value TEXT NOT NULL COMMENT '配置值',
  value_type ENUM('string','text','json','number','boolean') DEFAULT 'string',
  sort_order INT DEFAULT 0,
  UNIQUE KEY uk_group_key (group_id, config_key)
);

-- 配置变更日志（支持回滚）
CREATE TABLE sys_config_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  config_item_id INT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by INT,
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_item_time (config_item_id, changed_at)
);

-- 字典分组
CREATE TABLE sys_dict_group (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dict_key VARCHAR(64) NOT NULL UNIQUE COMMENT 'eg: video_duration',
  dict_name VARCHAR(128) NOT NULL
);

-- 字典项
CREATE TABLE sys_dict_item (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dict_group_id INT NOT NULL,
  item_key VARCHAR(64) NOT NULL,
  item_value VARCHAR(256) NOT NULL,
  item_extra JSON DEFAULT NULL COMMENT '扩展字段',
  sort_order INT DEFAULT 0,
  UNIQUE KEY uk_dict (dict_group_id, item_key)
);

-- 模板表（提示词/消息/海报模板）
CREATE TABLE sys_template (
  id INT AUTO_INCREMENT PRIMARY KEY,
  template_key VARCHAR(64) NOT NULL UNIQUE,
  template_name VARCHAR(128) NOT NULL,
  template_content TEXT NOT NULL COMMENT '含 {{variable}} 占位符',
  category VARCHAR(32) DEFAULT 'common',
  is_builtin TINYINT(1) DEFAULT 0,
  created_by INT DEFAULT NULL,
  UNIQUE KEY uk_tpl_key (template_key)
);
```

### 5.2 业务核心表概览

| 表名 | 所属服务 | 说明 |
|:--|:--|:--|
| `users` | MSG-ACCOUNT | 用户主表（含角色字段 role ENUM） |
| `user_roles` | MSG-ACCOUNT | 角色权限明细 |
| `membership_plans` | MSG-BILLING | 会员套餐（配置化读取） |
| `user_membership` | MSG-BILLING | 用户开通记录 |
| `points_account` | MSG-BILLING | 积分账户 |
| `points_transaction` | MSG-BILLING | 积分流水 |
| `distributor_relation` | MSG-DISTRIB | 分销上下级关系 |
| `distributor_commission` | MSG-DISTRIB | 返利流水 |
| `store_binding` | MSG-PLATFORM | 店铺绑定（电商商家） |
| `account_binding` | MSG-PLATFORM | 社媒账号绑定（达人） |
| `platform_adapter` | MSG-PLATFORM | 各平台画幅/格式适配规则 |
| `job_queue` | MSG-COMMON | 异步任务队列（含 retry_count/max_retries/scheduled_at ★v4.1） |
| `content_audit_log` | MSG-MODERATION | 内容风控审核日志 ★v4.1 |
| `platform_token` | MSG-PLATFORM | OAuth Token 加密存储 ★v4.1 |
| `media_asset` | MSG-ASSET | 云端素材库 |
| `media_template` | MSG-ASSET | 用户自定义模板 |
| `draft` | MSG-ASSET | 草稿箱（自动保存） |
| `model_registry` | MSG-SCHEDULE | 模型注册表 |
| `model_call_log` | MSG-SCHEDULE | 模型调用日志 |
| `operation_log` | MSG-COMMON | 操作审计日志 |
| `content_audit_log` | MSG-SECURITY | 内容风控审核日志 |

### 5.3 业务核心表 v4.1 补充

**job_queue 表补充字段 ★v4.1**：

```sql
ALTER TABLE job_queue ADD COLUMN retry_count INT DEFAULT 0;
ALTER TABLE job_queue ADD COLUMN max_retries INT DEFAULT 3;
ALTER TABLE job_queue ADD COLUMN scheduled_at DATETIME COMMENT '定时执行时间';
ALTER TABLE job_queue ADD COLUMN circuit_status ENUM('open','half_open','closed') DEFAULT 'closed';
ALTER TABLE job_queue ADD INDEX idx_status_created (status, created_at);
ALTER TABLE job_queue ADD INDEX idx_user_status (user_id, status);
```

**content_audit_log 表 ★v4.1**：

```sql
CREATE TABLE content_audit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  audit_type ENUM('input','output','publish') NOT NULL,
  content_type ENUM('text','image','video') NOT NULL,
  content_hash VARCHAR(64),
  risk_level ENUM('safe','warning','blocked'),
  audit_detail JSON COMMENT '命中规则详情',
  action ENUM('pass','warn','block') NOT NULL DEFAULT 'pass',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_created (user_id, created_at)
);
```

### 5.4 迁移脚本拆分 ★v4.1 更新

```
server/sql/
  m001_core.sql          ← 用户/角色/权限/配置(7张表)
  m002_business.sql      ← 视频/图片/数字人业务表
  m003_commerce.sql      ← 会员/分销/绑定/分发
  m004_asset_task.sql    ← 素材库/模板/草稿/任务队列
  m005_seed.sql          ← 初始化配置数据(约250条)
```

---

## 六、前端架构设计

### 6.1 页面结构

```
client/
├── pages/
│   ├── index.vue                    ← 首页工作台
│   ├── auth/                        ← 注册/登录/密码重置
│   ├── workspace/                   ← 工作区
│   │   ├── video/                   ← 视频核心
│   │   │   ├── index.vue            ← 视频功能入口
│   │   │   ├── generate.vue         ← 视频生成
│   │   │   ├── digital-human.vue    ← 数字人
│   │   │   ├── motion-migrate.vue   ← 动作迁移
│   │   │   ├── batch-migrate.vue    ← 批量动作迁移
│   │   │   ├── viral-analyze.vue    ← 爆款分析
│   │   │   ├── viral-replicate.vue  ← 爆款复刻
│   │   │   ├── ad-video.vue         ← 商品广告一键成片
│   │   │   ├── storyboard.vue       ← 视频分镜生成器
│   │   │   └── smart-cut.vue        ← 长视频智能精剪
│   │   ├── image/                   ← 图片核心
│   │   │   ├── index.vue
│   │   │   ├── generate.vue         ← 图像生成
│   │   │   ├── replicate.vue        ← 电商主图复刻
│   │   │   ├── batch-create.vue     ← 批量生图
│   │   │   └── batch-edit.vue       ← 批量改图/替换
│   │   └── detail/                  ← 电商详情图
│   │       ├── index.vue
│   │       ├── replicate.vue        ← 详情图复刻
│   │       └── set-generate.vue     ← 详情图套图生成
│   ├── assets/                      ← 云端素材库
│   ├── templates/                   ← 模板中心
│   ├── platform/                    ← 平台绑定/分发
│   └── account/                     ← 个人中心
│       ├── settings.vue
│       ├── membership.vue           ← 会员管理
│       ├── points.vue               ← 积分管理
│       └── distribution.vue         ← 分销管理
├── components/
│   ├── common/
│   │   ├── AppMediaUpload.vue       ← 通用上传组件（单/多选/格式/尺寸控制）
│   │   ├── AppTaskProgress.vue      ← 任务进度组件
│   │   ├── AppTemplatePicker.vue    ← 模板选择器
│   │   ├── AppPlatformPicker.vue    ← 平台选择器
│   │   ├── AppConfigText.vue        ← 配置化文案渲染组件
│   │   └── AppDictSelect.vue        ← 字典下拉选择器
│   ├── video/
│   │   ├── VideoPreview.vue
│   │   └── StoryboardView.vue
│   ├── image/
│   │   ├── ImagePreview.vue
│   │   └── BatchProgress.vue
│   └── platform/
│       ├── PlatformAdapter.vue      ← 平台适配预览
│       └── PublishDialog.vue        ← 分发对话框
├── composables/
│   ├── useAppConfig.ts              ← 获取页面/组件配置文案
│   ├── useAppDict.ts                ← 获取字典选项
│   ├── useAppPage.ts                ← 页面级一次性加载
│   ├── useTaskPolling.ts            ← 统一任务轮询
│   └── usePromptEnhance.ts          ← 统一提示词增强
├── stores/
│   ├── config.store.ts              ← 配置缓存
│   ├── user.store.ts                ← 用户信息+角色
│   └── workspace.store.ts           ← 工作区状态
├── layouts/
│   ├── default.vue                  ← 默认布局
│   ├── workspace.vue                ← 工作区布局
│   └── admin.vue                    ← 管理后台布局
├── middleware/
│   ├── auth.global.ts               ← 全局鉴权
│   └── role.ts                      ← 角色权限守卫
└── plugins/
    ├── api.client.ts                ← API 客户端
    └── dayjs.client.ts              ← 时间格式化
```

### 6.2 核心 Composable 规范

```typescript
// ❌ 禁止：文案写死
const title = 'AI 视频创作中心'
const menus = ['视频', '图片', '详情图']

// ✅ 必须：配置化读取
const { config } = useAppConfig('page.video')
const title = config.page_title
const { options: menus } = useAppDict('nav_workspace')

// composables/useTaskPolling.ts
// 统一处理 提交→等待→完成 状态流转，不每个页面自己写轮询
export function useTaskPolling(jobId: Ref<string | null>) {
  const status = ref<'pending'|'processing'|'completed'|'failed'>('pending')
  const progress = ref(0)
  const result = ref<any>(null)
  const error = ref<string | null>(null)
  // 自动轮询、自动停止、自动刷新
  const isSubmitting = ref(false)      // ★v4.1: 防重复提交锁
  const queuePosition = ref<number>(0) // ★v4.1: 排队位置
  async function submit(taskParams: any) {
    if (isSubmitting.value) return
    isSubmitting.value = true
    // ...
  }
  return { status, progress, result, error, isSubmitting, queuePosition, submit }
}

// composables/useAppConfig.ts
// 通过 useAsyncData 做 SSR 握手，首屏无白屏
// ★v4.1: SSE 监听配置版本号，检测变化后静默刷新
export function useAppConfig(groupKey: string) {
  const config = ref<Record<string, string>>({})
  const error = ref<Error | null>(null)
  const isFallback = ref(false)
  const { data } = useAsyncData(`config:${groupKey}`, () =>
    $fetch(`/api/config/${groupKey}`).catch(err => {
      error.value = err
      isFallback.value = true
      return FALLBACK_CONFIGS[groupKey] || {} // ★v4.1: 降级默认文案
    })
  )
  watchConfigVersion(groupKey, () => refreshNuxtData(`config:${groupKey}`))
  return { config, error, isFallback }
}
```

### 6.3 UI 设计系统

```css
:root {
  /* Design Token — 后台可配置覆盖 */
  --cfg-primary: var(--color-primary, #4F46E5);
  --cfg-success: var(--color-success, #10B981);
  --cfg-warning: var(--color-warning, #F59E0B);
  --cfg-danger:  var(--color-danger, #EF4444);
  --cfg-font-base: var(--font-size-base, 14px);
  --cfg-radius:  var(--border-radius, 8px);
  --color-primary: #4F46E5;
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-danger: #EF4444;
  --font-size-base: 14px;
  --border-radius: 8px;
}

[data-theme="dark"] {
  --color-primary: #6366F1;
  --color-bg: #0F172A;
  --color-surface: #1E293B;
  --color-text: #F1F5F9;
}

/* 配置化文案溢出保护 */
[data-config-text] {
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: var(--text-max-width, inherit);
  white-space: nowrap;
}
```

---

## 七、后端架构设计

### 7.1 目录结构

```
server/
├── src/
│   ├── controller/          ← 路由控制器（薄层，只做参数验证+响应）
│   ├── service/             ← 业务逻辑层
│   │   ├── auth.service.ts
│   │   ├── video.service.ts
│   │   ├── image.service.ts
│   │   ├── detail.service.ts
│   │   ├── digital-human.service.ts
│   │   ├── motion-migrate.service.ts
│   │   ├── viral.service.ts
│   │   ├── membership.service.ts
│   │   ├── points.service.ts
│   │   ├── distribution.service.ts
│   │   ├── moderation.service.ts    ← 内容风控审核 ★ 新增
│   │   ├── model-router.service.ts    ← 模型中台调度（含熔断器 ★v4.1）
│   │   ├── config.service.ts         ← 配置中心
│   │   ├── config-version.service.ts ← 配置版本推送 SSE ★v4.1
│   │   ├── platform.service.ts       ← 平台适配/分发
│   │   ├── platform-oauth.service.ts ← OAuth Token 管理 ★v4.1
│   │   ├── asset.service.ts          ← 素材库
│   │   └── job-queue.service.ts      ← 任务队列
│   ├── middleware/
│   │   ├── auth.middleware.ts         ← JWT 鉴权
│   │   ├── role.middleware.ts         ← 角色权限
│   │   ├── content-moderation.middleware.ts  ← ★ 内容风控（安全层之后、业务层之前）
│   │   ├── rate-limit.middleware.ts   ← 防刷限流
│   │   └── audit-log.middleware.ts    ← 操作日志
│   ├── model/                ← 数据库模型（DAO层）
│   ├── adapter/              ← 模型适配器
│   │   ├── base.adapter.ts   ← Adapter 接口
│   │   ├── seedance.adapter.ts
│   │   ├── tongyi.adapter.ts
│   │   ├── qwen.adapter.ts
│   │   ├── digital-human.adapter.ts
│   │   └── custom.adapter.ts
│   ├── platform-adapter/     ← 平台适配器
│   │   ├── base.adapter.ts
│   │   ├── taobao.adapter.ts
│   │   ├── douyin.adapter.ts
│   │   ├── tiktok.adapter.ts
│   │   └── ...（25个平台）
│   └── utils/
│       ├── ai-caller.ts      ← AI 调用封装（超时/重试/降级/熔断 ★v4.1）
│       ├── circuit-breaker.ts ← 模型熔断器 ★v4.1
│       ├── file-upload.ts    ← 统一文件上传（含分片/断点续传 ★v4.1）
│       ├── cos.ts            ← 对象存储+COS
│       ├── token-encrypt.ts  ← Token AES-256 加解密 ★v4.1
│       └── seed-validator.ts ← 配置种子数据校验 ★v4.1
├── sql/
│   ├── m001_core.sql
│   ├── m002_business.sql
│   ├── m003_commerce.sql
│   ├── m004_asset_task.sql
│   └── m005_seed.sql
└── test/
```

### 7.2 接口规范

```
# 统一响应格式
{
  "code": 0,
  "message": "success",
  "data": { ... }
}

# 视频生成（异步）
POST /api/video/generate          → { job_id }
GET  /api/video/status/:job_id    → { status, progress, result }
GET  /api/video/list              → { items, total }

# 动作迁移（异步）
POST /api/motion/migrate          → { job_id }
POST /api/motion/batch            → { job_ids[] }

# 图片生成（同步轻量/异步批量）
POST /api/image/generate          → { image_url }
POST /api/image/batch             → { job_id }

# 配置中心
GET    /api/config/:group          ← 前端读取（公开组无需登录）
POST   /api/admin/config           ← 后台写入（admin/运营）
GET    /api/admin/config/log/:id   ← 变更日志

# 字典
GET  /api/dict/:dictKey           ← 获取字典选项

# 平台分发
POST /api/platform/publish        ← 多平台分发
GET  /api/platform/adapters       ← 可用平台列表

# 素材库
GET    /api/asset/list
DELETE /api/asset/:id
POST   /api/template/save
GET    /api/template/list
POST   /api/draft/save
GET    /api/draft/list

# ★v4.1 新增接口
# 分片上传
POST   /api/upload/init              → { upload_id }
POST   /api/upload/chunk             → { chunk_id, status }
POST   /api/upload/complete          → { url }
# 配置版本推送
GET    /api/config/version/stream    → SSE stream
# OAuth 平台绑定
POST   /api/platform/oauth/:platform → { redirect_url }
GET    /api/platform/oauth/callback  → { token }
DELETE /api/platform/oauth/:platform → { } 解绑
# 种子数据校验
GET    /api/admin/config/seed/verify → { valid, missing, dangling }
# 内容审核
POST   /api/moderation/check         → { risk_level, action }
```

### 7.3 安全规范

| 层 | 措施 |
|:--|:--|
| 接口层 | JWT token + role middleware 权限校验 |
| 防刷 | 接口频率限制 60次/分钟（免费用户）、300次/分钟（付费） |
| 内容风控 | 生成前关键词过滤 + 生成后 AI 内容审核 |
| 隐私 | 用户手机号/邮箱 AES-256 加密存储、密码 bcrypt 加盐 |
| 传输 | HTTPS + API 签名（防止中间人篡改） |
| 文件 | 上传文件类型白名单 + 大小限制 + 病毒扫描 |

---

## 八、开发排期（14周）

| 窗口 | 周期 | 核心交付 | 功能数 |
|:--|:--|:--|:--:|
| **W1 基础** | 第1-3周 | 注册登录/文件上传/配置中心DB+API+后台/工作台/角色权限 | 8 |
| **W2 图片** | 第4-6周 | 图像生成+提示词增强引擎/主图复刻/批量生图改图替换/详情图复刻套图 | 8 |
| **W3 视频** | 第7-10周 | 视频生成/数字人/分镜/广告成片/单图生视频/多图合成/自动包装/角色替换/爆款分析+复刻 | 15 |
| **W4 杀手+商业化** | 第11-14周 | 动作迁移+批量/长视频精剪/多平台分发/店铺+账号绑定/剪映对接/会员+积分+分销/联调上线 | 12 |

---

## 九、技术选型

| 层 | 选型 | 说明 |
|:--|:--|:--|
| 前端框架 | Nuxt3 (SSR) | 配置化文案需要 SSR 握手，SEO友好 |
| UI 组件库 | PrimeVue + TailwindCSS | 组件丰富 + 原子化样式 |
| 后端框架 | Express.js + TypeScript | 轻量灵活 |
| 数据库 | MySQL 8.0 | 事务 + JSON字段 |
| 缓存 | Redis 7 | 配置热更新 + 任务队列（后期） |
| 对象存储 | MinIO（私有部署）/ 阿里云 OSS | 图片视频存储 |
| CDN | 阿里云 CDN | 加速分发 |
| AI 模型 | Seedance/通义万象/千问 等 | 模型适配器模式接入 |

---

## 十、扩展预留

| 能力 | 预留方式 | 说明 |
|:--|:--|:--|
| 多语种 | 配置表 `locale` 字段 + i18n 层 | 所有文案进配置表，加语种维度即可 |
| 海外版本 | 多租户架构（tenant_id） | 用户/配置/数据按租户隔离 |
| 对外 API | API Key + OAuth 2.0 鉴权 | 开放图片/视频生成能力给第三方调用 |
| 新 AI 模型 | Adapter 接口注册 | 实现 BaseAdapter → 后台配置 → 即插即用 |
| 新平台 | PlatformAdapter 接口注册 | 实现 BasePlatformAdapter → 后台添加配置 |
| 新功能模块 | 配置表新增分组+字典 | 不动核心代码，运营后台加配置即可 |

---

**定稿人**: G2 项目统筹 | **终审**: G1 架构规划
**旧版作废**: v1.0 / v2.0 / v3.0 不再参考
**开发依据**: 本文档 + `配置化全栈开发规范_v1.0.md` 共同构成唯一开发依据
