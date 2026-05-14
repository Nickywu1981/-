# ADR-023: 可视化画布拼装落地策略

**日期**: 2026-05-14
**状态**: 已定版（第三轮组件级+数据库级深挖更新）
**决策者**: G1 架构规划组（Architect + Security-Auditor）

---

## 背景

项目需要实现可视化画布拼装功能，支持"拖拽→生成页面→绑定事件→调用接口→保存并渲染"核心链路。
经过三轮递进评估（策略级 → 代码级 → 组件级+数据库级），现有结论如下。

---

## 第三轮深挖核心发现（新增）

### 发现 G：不存在独立的 DIY 组件 — 全部塞在一个 v-if 链

`client/components/diy/` 目录下只有 1 个文件 `VersionHistoryModal.vue`。12 个业务组件（banner_slider / title_bar / text_block / product_list / countdown / coupon_card / button_group / image_showcase / video_player / hotzone_image / form_container / nav_bar）**没有独立的 .vue 文件**，全部由 `DiySectionPreview.vue:2-78` 的单体 v-if/v-else-if 链渲染。

**后果**：S3（动态渲染）必须先将这 12 个分支拆成独立组件，才能用 `:is` 动态渲染。S3 风险从"高"修正为"**极高**"——拆解过程可能触发渲染回归。

### 发现 H：组件注册表是静态 const，没有插件式注册 API

`useDiyComponents.ts:12` — `export const DIY_COMPONENTS: DiyComponentCatalog = {...}`。没有 `register()` 函数，没有 reactive store，无法让第三方/运营添加自定义组件。

### 发现 I：全部样式使用绝对 px — 在变宽画布列中会溢出

`DiySectionPreview.vue:110-141` 所有样式声明使用固定 `px`（padding: 24px 36px、height: 60px、max-height: 180px 等），零个 `rem`/`em`/`%`/`clamp()`。拖入非标准宽度的画布列会溢出或截断。

### 发现 J：自动保存存在 3 个隐蔽 Bug

| Bug | 代码位置 | 影响 |
|-----|---------|------|
| **J-1** 双端配置污染 | `useDiyAutoSave.ts:49` — `mobileConfig: { sections: clone(sections) }, pcConfig: { sections: clone(sections) }` | **自动保存把当前模式 sections 同时写入 mobileConfig 和 pcConfig**，未激活模式的配置被覆盖 |
| **J-2** 拖拽期间无法自动保存 | `useDiyAutoSave.ts:82` — `watch(() => getSections(), resetTimer, { deep: true })` | 每次拖拽移动触发 deep watch → 重置 30s 计时器。拖拽 5 秒 = 用户拖完后仍需等 30s 才保存 |
| **J-3** 崩溃恢复返回错误结构 | `useDiyAutoSave.ts:74` — `return d.pc_config \|\| d.mobile_config` | 返回的是 `{sections: [...]}` 对象，但编辑器期望的是 `DiySection[]` 数组 |

### 发现 K：批量发布绕过所有校验

`diyDao.js:259-288` `batchPublishWithVersions()` 不调用 `validateBeforePublish`。批量发布 N 个页面时，全部跳过组件完整性校验。

### 发现 L：`latest_published_version` 字段从未写入

`diy_page` 表有 `latest_published_version` 列，SQL 查询中也 SELECT 了它，但所有 INSERT/UPDATE 语句从未设置它——字段始终为 NULL。

---

## 第三轮新增的 S0 修复项

| 编号 | 问题 | 文件:行 | 严重度 |
|:---:|------|------|:---:|
| **S0-6** | 自动保存双端配置污染 | `useDiyAutoSave.ts:49` | **P0** |
| **S0-7** | 崩溃恢复返回结构错位 | `useDiyAutoSave.ts:74` | P1 |
| **S0-8** | 拖拽期间 30s 无法保存 | `useDiyAutoSave.ts:82` | P1 |
| **S0-9** | 批量发布绕过校验 | `diyDao.js:265-272` | **P0** |
| **S0-10** | `latest_published_version` 不更新 | `diyDao.js:315-322` | P2 |

累计 S0 修复项：**10 项**（第一轮 0 → 第二轮 5 → 第三轮 +5），S0 周期从 1.5 天修正为 **2.5 天**。

---

## 数据库表结构审计（第三轮新增）

### `diy_page` 表

| 列 | 类型 | 评估 |
|----|------|------|
| id, tenant_id, owner_id | INT | OK |
| title, slug | VARCHAR | OK，slug 缺少 UNIQUE 约束 |
| page_type | VARCHAR | OK，含 mobile/pc/h5/landing/detail/activity/custom **但无 canvas 类型** |
| access_type | VARCHAR | OK（public/private） |
| status | TINYINT | OK（0草稿/1已发布/2已下线/3回收站） |
| mobile_config, pc_config | JSON/TEXT | OK，**但无 canvas_config 列** |
| meta_json | JSON/TEXT | OK |
| publish_time, offline_time | DATETIME | OK |
| access_count | INT | OK |
| latest_published_version | INT | **BUG：字段存在但从未被 UPDATE 写入** |
| create_time, update_time | TIMESTAMP | OK |

### `diy_page_version` 表

| 列 | 评估 |
|----|------|
| page_id, version | OK，复合主键 |
| mobile_config, pc_config | JSON，OK |
| remark, auto_save, rollback_from | OK |
| 自动保存保留最近 30 条 | OK（`diyDao.js:166-168`） |

### `diy_component` 表

| 列 | 评估 |
|----|------|
| tenant_id, is_builtin | OK，支持租户级自定义组件 |
| default_config | JSON，**但前端 `useDiyComponents.ts` 不读取此表，全部硬编码** |
| 结论 | **DB 已支持动态组件注册，前端未对接** |

### `diy_template` 表

| 评估 |
|------|
| 结构完整。industry/page_type/thumbnail/tags 齐全 |
| `use_count` 递增有 `incrementTemplateUse()` 支持 |

---

## 架构分层评分（第三轮修正）

### 组件封装度

| 标准 | 第二轮 | 第三轮 | 原因 |
|------|:---:|:---:|------|
| 可注册 | 5/10 | **3→\(^1\)**/10 | DB 支持动态注册，前端是静态 const |
| 可配置 | 7/10 | 7/10 | 不变 |
| 可拖拽 | 2/10 | 2/10 | 不变 |
| 可绑定 | 0→设计就绪 | 设计就绪 | 不变 |

> \(^1\) 降分原因：DB 层 `diy_component` 表支持租户自定义组件（`tenant_id + is_builtin`），但前端 `useDiyComponents.ts` 是硬编码 const，**前后端组件注册完全断裂**。

### 基础设施支撑度

| 层次 | 第二轮 | 第三轮 | 原因 |
|------|:---:|:---:|------|
| 后端 6 层 | 7.5/10 | 7.5/10 | 不变 |
| 权限体系 | 3/10 | 3/10 | 不变 |
| 多租户 | 7/10 | 7/10 | 不变 |
| API 契约 | 4/10 | **3/10** | `z.unknown()` 透传 + 批量绕过校验 + version 字段不更新 |
| 数据库 | — | **6/10** | 表结构设计合理（JSON列/软删除/版本表/组件表/事务），但 `latest_published_version` 落库缺失 |

---

## 决策（不变）

**选择方案 A：最小改动路线**

---

## 修正后完整落地路径（S0-S9）

### S0 前置修复（2.5 天，10 项）

```
P0 (阻塞项，必须最先修):
  S0-1  diyService.js:23-29        s.props → s.config (复活校验器)
  S0-2  diyRoutes.js:16,19,38-50   z.unknown() → z.object({}).passthrough()
  S0-3  diyDao.js:55-61             findBySlug 增加 tenant_id 过滤
  S0-6  useDiyAutoSave.ts:49        自动保存分离 mobile/pc 双端配置
  S0-9  diyDao.js:265-272           批量发布增加 validateBeforePublish

P1 (发布前修):
  S0-4  paramFilter.js:12-21        INJECTION_PATTERNS 增加 __proto__/constructor/prototype
  S0-7  useDiyAutoSave.ts:74        崩溃恢复返回 sections 数组而非 config 对象
  S0-8  useDiyAutoSave.ts:82        拖拽期间 debounce 从 30s 降至 3s

P2 (低成本顺手修):
  S0-5  diyRoutes.js:54-56          diffSchema version 改为 z.coerce.number()
  S0-10 diyDao.js:315-322           publishWithVersion 写入 latest_published_version
```

| 指标 | 第二轮 | 第三轮 |
|------|:---:|:---:|
| S0 项数 | 5 | **10** |
| S0 周期 | 1.5 天 | **2.5 天** |

### S1-S9（不变）

| 步骤 | 内容 | 风险 | 周期 |
|------|------|:---:|:---:|
| **S1** | 统一类型定义（PageSchema/EventSchema/ActionSchema） | 低 | 2d |
| **S2** | `useDiyComponents.ts` 增加 `events` 声明 | 低 | 1d |
| **S3** | `DiySectionPreview.vue` 拆 12 个独立组件 + `:is` 动态渲染 | **极高** | 5d |
| **S4** | `diyRoutes.js` Zod 强类型 SectionSchema | 高 | 2d |
| **S5** | 新增 `ownershipGuard` 页面级权限中间件 | 中 | 1d |
| **S6** | 引入 vuedraggable 替换 3 个原生 DnD 区 | 中 | 3d |
| **S7** | Section 扩展 `position: {x,y,w,h}` | 低 | 1d |
| **S8** | 事件运行时 `useDiyEventRuntime.ts` | 中 | 3d |
| **S9** | 服务端 `validateBindings()` | 中 | 3d |

### 最终时间线

```
S0: 前置修复 ——————————————— 2.5天 ──┐
                                    ├── 就绪门槛 ~3周
S1-S5: 核心改造 ————————————— 2周 ──┘
S6-S7: 体验提升 ————————————— 1周
S8-S9: 事件绑定 (Phase 2) —— 1.5周

总计: S0-S9 ≈ 6.5周
其中 S3 占据整条路径的关键路径（5天 + 回归测试 + Bug 修复）
```

| 指标 | 第一轮 | 第二轮 | 第三轮 |
|------|:---:|:---:|:---:|
| 总周期 | 4-5 周 | 6 周 | **6.5 周** |
| 风险等级 | 低 | 中 | **中高** |
| 改造文件数 | 6 | ~12 | **~15** |
| P0 前置修复 | 0 | 5 | **7** |
| S0 前置修复总计 | 0 | 5 | **10** |

---

## S3 专项风险：单体 v-if 链拆解计划

`DiySectionPreview.vue:2-78` 单体文件拆为 12 个独立组件：

```
client/components/diy/
├── DiyBannerSlider.vue      ← banner_slider
├── DiyTitleBar.vue          ← title_bar
├── DiyTextBlock.vue         ← text_block
├── DiyProductList.vue       ← product_list
├── DiyCountdown.vue         ← countdown (含响应式 timer 修复)
├── DiyCouponCard.vue        ← coupon_card
├── DiyButtonGroup.vue       ← button_group
├── DiyImageShowcase.vue     ← image_showcase
├── DiyVideoPlayer.vue       ← video_player
├── DiyHotzoneImage.vue      ← hotzone_image
├── DiyFormContainer.vue     ← form_container
├── DiyNavBar.vue            ← nav_bar
└── index.ts                 ← 统一导出 + 组件映射表
```

每个组件接收统一 props（`section: DiySection`）并 emit 统一事件（`click`/`config-change`/`visible-change`）。拆解顺序：先拆无状态的（title_bar/text_block/nav_bar），再拆有交互的（countdown/coupon_card/form_container），最后拆复杂组件（banner_slider/hotzone_image）。

---

## 关键安全边界（不变）

### 事件绑定安全模型

```
编辑器 (已认证，editorOrAbove)
  │
  ├── 编辑 config_json.bindings
  │
  ▼
服务端发布闸门 (validateBindings)
  ├── ALLOWED_BINDING_ENDPOINTS 白名单检查
  ├── SAFE_PATH_PATTERN: /^\$(event|section|state|page)(\.[a-zA-Z_][a-zA-Z0-9_]*)*$/
  ├── ALLOWED_EVENT_KEYS 注册表检查
  ├── sectionId 必须存在于页面的 sections 数组
  └── 任一违规 → 拒绝发布 + 具体错误消息
  │
  ▼
config_json 存入 DB (纯 JSON，无可执行内容)
  │
  ▼
终端用户浏览器加载已发布页面
  ├── resolveBinding() 纯属性遍历，无 eval/new Function
  ├── $fetch 使用用户自身 session (credentials:'include')
  └── 无编辑器侧代码路径可在终端用户浏览器执行
```

---

## 修改风险评估矩阵（第三轮更新）

| 风险点 | 概率 | 影响 | 缓解 |
|------|:---:|------|------|
| **S3 拆解 12 组件引入渲染回归** | **高** | 高 | 逐组件拆解 + snapshot 测试 + 渐进替换 |
| S0-6 自动保存双端配置修复触发边界 case | 中 | 中 | 先分离 mobile/pc，再修复 debounce |
| S4 收紧 Schema 暴露历史数据不合规 | 中 | 高 | `.passthrough()` 过渡，不严格拒绝 |
| S0-9 批量发布增加校验后大面积报错 | 低 | 中 | 先 dry-run 扫描现有页面 |
| S6 vuedraggable 替换拖拽交互退化 | 低 | 低 | 保留原生 DnD 作为 fallback |
| 事件运行时性能 (多 binding + 大页面) | 低 | 中 | Map 索引 O(1) + 防重入 guard |

---

## 后续决策节点

| 节点 | 触发条件 | 决策 |
|------|---------|------|
| N0 | S0 完成 | 10 项安全缺口是否全部关闭 |
| N0.5 | S3 拆解完成 | 12 组件独立渲染无回归 |
| N1 | S5 完成 | 是否进入 S8-S9 事件绑定 |
| N2 | 组件数接近 50 | 是否提取独立渲染引擎 |
| N3 | 满足 SDK C1-C5 任一条件 | 是否启动 `@movio/canvas-sdk` |
| N4 | `diy_component` 表有非内置组件 | 前端 `useDiyComponents` 是否对接 DB |

---

## 关联

- ADR-014: DIY 模板库
- CLAUDE.md: 架构分层与安全红线
- `.claude/agents/architect.md`: G1 架构师职责
- `.claude/agents/security-auditor.md`: G1 安全审计师职责
