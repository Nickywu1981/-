# 可视化画布 — 方案 B 任务总清单

> 生成日期：2026-05-14 | 更新：2026-05-14 | **状态：❄️ 冻结（Decision 024）**
> 
> 全链路分阶段战略：画布为可选功能，B1/B3/B5+ 全程暂不开发。
> B2（WorkPipeline）+ B4（页面迁移）已完成并正常运行，继续维护。
> 
> 原预估：5 周 | 原策略：方案 B | 冻结范围：B1/B3/B5+

---

## 1. B1 — 组件标准化地基（1.5 周）

> **目标**：建立画布运行时内核 | **风险**：低（新组件，零业务影响）

| # | 任务 | 负责组 | 优先级 | 预估 | 依赖 |
|---|------|--------|:--:|------|------|
| B1.1 | 扩展 `DiySection` 类型：新增 `children`、`events`、`bindings`、`_schemaVersion`、`_migrations` 字段 | G4 Frontend-B | P0 | 0.5d | 无 |
| B1.2 | 建 `componentRegistry.ts` — `Map<code, { renderer, propsSchema, defaultConfig, loadingComponent?, emptyComponent?, errorComponent?, deprecated? }>` 全局注册表。renderer 使用 `defineAsyncComponent(() => import('./path.vue'))` 懒加载，避免 53+ 组件全量打入主 bundle。含三态占位和废弃标记字段 | G4 Frontend-B | P0 | 1d | B1.1 |
| B1.2a | 组件生命周期管理：registry 移除组件前扫描画布配置引用计数，有引用则阻止并提示"X 个画布正在使用此组件"；`deprecated` 标记的组件编辑器组件库不显示但已有画布仍可渲染，工具栏标注"（已废弃）" | G4 Frontend-B | P1 | 0.5d | B1.2 |
| B1.3 | 重构 `DiySectionPreview.vue` — 用 `<component :is>` + registry 替代 12 分支硬编码 | G4 Frontend-A | P0 | 1d | B1.2 |
| B1.4 | 建 `CanvasRenderer.vue` — 递归渲染树形 sections，支持嵌套容器 | G4 Frontend-A | P0 | 1.5d | B1.3 |
| B1.5 | 扩展 `useDiyEditor.ts` — undo/redo 支持树形结构，addChild/removeChild 操作 | G4 Frontend-B | P0 | 1d | B1.1 |
| B1.6 | 新增 Container 类组件（Grid/Flex/Tabs/Collapse），注册到 registry | G4 Frontend-A + G3 UI | P0 | 1d | B1.4 |
| B1.7 | `diy_page` 配置兼容：旧扁平 sections 自动迁移到新树形结构 | G6 Backend-B | P0 | 0.5d | B1.5 |
| B1.8 | 更新 Zod 校验：sections 支持嵌套 children，connections 数组 schema 校验（from/to 必填、fromPort/toPort 枚举、sectionId 引用完整性） | G5 Backend-A | P0 | 0.5d | B1.1 |
| B1.9 | 建 `useCanvasDragDrop.ts` — 组件库→画布拖入 + 画布内跨容器拖拽 + drop zone 高亮 + 循环引用检测（拖入前检查目标是否为拖拽源的后代，是则阻止并提示）+ 仅剩 1 组件时 Delete 阻止（基于 HTML5 DnD API） | G4 Frontend-A | P0 | 1.5d | B1.4 |
| B1.10 | 数据库 migration：`diy_page` 表新增 `sections_tree` JSON 列 + `connections` JSON 列，兼容旧 `sections` 字段 | G6 Backend-B | P0 | 1d | B1.1 |
| B1.10a | DB migration 回滚脚本：提供 rollback SQL 删除 `sections_tree` + `connections` 列；迁移前自动备份 `diy_page` → `diy_page_backup_YYYYMMDD` 快照表 | G6 Backend-B | P1 | 0.5d | B1.10 |
| B1.11 | 建 `schemaMigration.ts` — 组件 propsSchema 升级时自动迁移旧配置：新增字段填默认值、删除字段忽略、重命名字段查 `migrations` 映射表 | G4 Frontend-B | P1 | 1d | B1.2 |
| B1.12 | 核心模块单元测试：`componentRegistry`(注册/去重/查询/废弃/移除拦截)、`CanvasRenderer`(递归渲染/嵌套深度限制/空状态引导)、`useCanvasDragDrop`(拖入/跨容器/撤销/循环引用拦截)、`schemaMigration`(新增/删除/重命名字段迁移)、`ErrorBoundary`(异常捕获/占位卡片渲染/重试按钮/级联隔离) | G6 QA-Engineer | P1 | 1d | B1.3, B1.4, B1.9, B1.11, B1.13, B1.15 |
| B1.13 | 建 `<ErrorBoundary>` 组件：包裹每个画布组件，`onErrorCaptured` 捕获子组件异常，崩溃时显示占位卡片（组件名+错误摘要+重试按钮），隔离故障不级联 | G4 Frontend-A | P0 | 0.5d | B1.4 |
| B1.14 | 画布配置大小限制：DB `diy_page` 表 `sections_tree` + `connections` JSON 列设定 1MB 上限（MySQL LONGTEXT）；编辑器保存前 `JSON.stringify(config).length` 客户端预检，超限提示 | G6 Backend-B + G5 Backend-A | P1 | 0.5d | B1.10a |
| B1.15 | 画布空状态引导：`CanvasRenderer` 无组件时渲染居中引导区（"拖入组件开始搭建你的 AI 工作流" + "打开组件库"按钮），非空白 | G4 Frontend-A + G3 UI | P1 | 0.5d | B1.4 |
| B1.16 | CI/CD 管线：GitHub Actions workflow 配置（lint → 单元测试 → build → bundle size check），每次 PR 触发；bundle size check：编辑器首屏 JS >500KB 时 CI 告警；Storybook 静态站点部署（netlify/gh-pages） | G6 QA-Engineer + G6 Backend-B | P1 | 0.5d | B1.12 |

> **验收标准**：新组件注册到 registry → 画布自动渲染，无需改渲染器代码。Grid 容器可嵌套子组件。

---

## 2. B2 — 工作台配置化（1 周）

> **目标**：41 个工作台页面从硬编码变为配置驱动 | **风险**：低（新建组件，不影响现有页面）

| # | 任务 | 负责组 | 优先级 | 预估 | 依赖 |
|---|------|--------|:--:|------|------|
| B2.1 | 建 `WorkPipeline.vue` 通用组件（上传→选参→生成→展示 骨架） | G4 Frontend-A | P0 | 2d | 无 |
| B2.2 | 建 6 个选项控件：select_card_grid, tag_chips, color_picker, text_input, slider, language_selector | G4 Frontend-A + G3 UI | P0 | 1.5d | B2.1 |
| B2.3 | 建 2 个上传控件：image_upload(单), dual_upload(双图) | G4 Frontend-A | P0 | 0.5d | B2.1 |
| B2.4 | 建 5 个结果渲染器：single_image, image_compare, image_grid, text_output, audio_player | G4 Frontend-A + G3 UI | P0 | 1.5d | B2.1 |
| B2.5 | 定义 `WorkPipelineConfig` TypeScript 类型（upload/options/task/result 四段配置） | G4 Frontend-B | P0 | 0.5d | B2.1 |
| B2.5a | 建配置迁移脚手架脚本：扫描 `client/pages/work/` 下 Pattern-A 页面 → 提取上传类型/选项参数/API 端点/结果类型 → 输出 JSON 骨架。非全自动（人工校准参数），但消除 80% 手工字段填写 | G4 Frontend-A | P0 | 1d | B2.5, B2.6 |
| B2.6 | 统一后端任务调用适配器：将 `useTask`(单次) / `useTaskPolling`(轮询) 统一为 `taskAdapter.execute(config)` — 输入 `{ endpoint, method, payload, pollInterval? }`，输出 `{ status, result, error }` 标准化响应 | G5 Backend-A | P1 | 1d | 无 |
| B2.7 | 验证：用 B2 组件拼出 color-change 页面，与原硬编码版本 UI 对比一致 | G6 QA-Engineer | P0 | 0.5d | B2.1-B2.5 |
| B2.8 | WorkPipeline + 全部控件/渲染器接入 i18n（`$t()` 包裹所有用户可见文案） | G4 Frontend-B | P1 | 0.5d | B2.2, B2.3, B2.4 |
| B2.9 | 搭建组件文档/Storybook：6 个选项控件 + 2 个上传控件 + 5 个结果渲染器 + WorkPipeline 均可独立预览和交互测试，记录 color-change 页面 Lighthouse Performance 基线 | G3 UI-Designer + G6 QA-Engineer | P1 | 1d | B2.2, B2.3, B2.4, B2.7 |

> **验收标准**：一份 JSON 配置即可渲染完整工作流，UI 与硬编码版本一致。控件和渲染器可独立复用。

---

## 3. B3 — 画布接入工作台（1 周）

> **目标**：B2 的 AI 工作流组件可在画布中拖拽组合 | **风险**：中（涉及画布编辑器改造）

| # | 任务 | 负责组 | 优先级 | 预估 | 依赖 |
|---|------|--------|:--:|------|------|
| B3.1 | 为每个 WorkPipeline 组件创建画布包装器（标准化 props/events） | G4 Frontend-A | P0 | 1.5d | B2, B1.4 |
| B3.2 | 扩展画布编辑器左侧组件库：新增"AI 工作流"分类 | G4 Frontend-A | P0 | 0.5d | B3.1 |
| B3.3 | 组件间"连线"交互：画布上绘制 SVG 连线（上游 output port → 下游 input port），连线数据存储为 `connections` 数组 | G4 Frontend-B | P0 | 1.5d | B3.1 |
| B3.4 | 画布预览模式执行引擎：按连线拓扑排序串行执行（上游 API 返回 → 结果注入下游 props → 触发下游调用），每步显示执行状态 | G4 Frontend-A | P0 | 1.5d | B3.3 |
| B3.4a | 管线错误处理：中途失败时保留已完成步骤结果、失败步骤显示错误+重试按钮、未执行步骤显示"等待上游"、支持一键重试 | G4 Frontend-B | P0 | 0.5d | B3.4 |
| B3.5 | 画布工作流保存为模板 + 从模板加载（API: G5 Backend-A, DAO: G6 Backend-B） | G5 Backend-A + G6 Backend-B | P0 | 1.5d | B3.4 |
| B3.6 | API 端点白名单校验（画布配置中引用的端点需在白名单内，白名单存储在 `server/src/config/canvasApiWhitelist.js`） | G5 Backend-A + G1 Security | P1 | 0.5d | B3.4 |
| B3.7 | 改造 `client/pages/diy/editor.vue`：左侧组件库新增"AI 工作流"分类 Tab + 画布区支持拖入工作流组件 + 预览模式切换 | G4 Frontend-A | P0 | 1d | B3.1, B3.2 |
| B3.7a | 画布键盘快捷键：Ctrl+Z 撤销 / Ctrl+Y 重做 / Ctrl+S 保存 / Delete 删除选中组件（最后 1 个阻止）/ Escape 取消选中/关闭弹窗。快捷键映射表可配置，不与浏览器默认冲突 | G4 Frontend-A | P1 | 0.5d | B3.7 |
| B3.7b | 画布面包屑导航 + 路由实现：`/canvas/:id`（编辑）/ `/canvas/:id/preview`（只读）路由注册；编辑器顶部面包屑（工作台 > 画布编辑器 > [画布标题]）；画布标题可编辑（默认"未命名画布"）；移动端 User-Agent 检测自动重定向到 `/preview`；B4 迁移后旧路由保留 `?useLegacy=1` 回退 | G4 Frontend-A + G5 Backend-A | P1 | 0.5d | B3.7, B4.8 |
| B3.8 | 画布 a11y：拖拽区域支持键盘操作（Tab 导航→Enter 选中→方向键移动→Delete 删除）、组件库支持屏幕阅读器朗读、连线端子标注 aria-label | G4 Frontend-A | P1 | 1d | B3.7 |
| B3.8a | 移动端只读预览：`CanvasRenderer` 接收 `readonly` prop，移动端 User-Agent 检测 → 隐藏组件库/拖拽/连线/编辑工具栏，仅渲染画布结果。顶部提示条"移动端仅支持预览，请在桌面端编辑" | G4 Frontend-A | P1 | 0.5d | B1.4 |
| B3.9 | 安全测试：XSS（组件标题/描述注入 `<script>`/`<img onerror>` 等 payload）→ DOMPurify 清洗验证；SSRF（配置中引用非白名单 API 端点）→ 拦截验证；配置注入（构造非法 componentCode/超限嵌套/超大 JSON）→ Zod 拒绝验证；多租户隔离（tenant A 无法访问 tenant B 的画布，直接访问 URL 返回 404） | G1 Security-Auditor + G6 QA-Engineer | P1 | 1d | B3.6, B1.8 |
| B3.10 | 组件库搜索/筛选：搜索框输入关键词实时过滤组件列表 + 分类 Tab（落地页/AI工作流/容器/全部）快速切换 | G4 Frontend-A | P1 | 0.5d | B3.2 |
| B3.11 | 并发保存乐观锁：保存画布时比对 `updated_at`，冲突返回 409 + 提示"已被他人修改，请刷新后重试"（API: G5 Backend-A, DAO: G6 Backend-B） | G5 Backend-A + G6 Backend-B | P1 | 0.5d | B3.5 |
| B3.12 | 撤销历史持久化 + 离开保护：撤销栈写入 sessionStorage（跨路由导航保留），`beforeunload` 弹窗拦截未保存更改，重新打开编辑器时提示恢复草稿 | G4 Frontend-A | P1 | 0.5d | B3.7 |
| B3.13 | 画布组件默认三态占位组件实现：`DefaultLoading`(骨架屏)、`DefaultEmpty`("暂无数据"插画+文案)、`DefaultError`("加载失败"插画+重试按钮)。未自定义三态的组件使用全局默认，有自定义的用注册表字段覆盖 | G4 Frontend-A + G3 UI | P1 | 0.5d | B1.2, B1.13 |
| B3.14 | 埋点实现：canvas_component_add / canvas_pipeline_create / canvas_pipeline_execute / canvas_template_save / workbench_page_migrated / canvas_mobile_view（客户端 `navigator.sendBeacon` + 服务端采集端点，PRD 定义的 6 项全量覆盖） | G4 Frontend-B + G5 Backend-A | P1 | 0.5d | B3.7, B3.8a |
| B3.15 | 建 `<PropertyPanel>` 动态属性面板：根据 registry 中 `propsSchema` 自动渲染表单控件（string→input、enum→select、color→color picker、boolean→switch、image→upload preview），选中画布组件时面板显示对应属性，未选中时显示画布级设置（标题/描述/背景色）。修改属性后面板标记脏字段，画布组件实时预览更新 | G4 Frontend-A + G3 UI | P0 | 1.5d | B1.2, B3.7 |
| B3.16 | 保存状态指示器：编辑器标题栏显示 ●已保存(绿) / ●未保存(橙) / ◌保存中(灰旋转)，与 B3.12 的 beforeunload + sessionStorage 形成双层保护。手动保存(Ctrl+S)和自动检测(任何 undoable 操作后标记未保存)双触发 | G4 Frontend-A | P1 | 0.5d | B3.7 |
| B3.17 | 暗黑模式兼容：画布编辑器、组件库面板、属性面板、连线 SVG、drop zone 高亮、空状态引导区、ErrorBoundary 占位卡片全部使用项目 `design-tokens.css` CSS 变量（`var(--color-*)`/`var(--bg-*)`/`var(--border-*)`），不写硬编码颜色。验收：切换暗黑模式后所有面板可读、连线可见、拖拽高亮可辨识 | G4 Frontend-A + G3 UI | P1 | 0.5d | B3.7, B3.13 |
| B3.18 | 运行时错误上报：ErrorBoundary 捕获异常后 `navigator.sendBeacon` 静默上报到 `/api/canvas/error-report`（componentCode + error.message + error.stack + canvasId + timestamp）；服务端 `canvasErrorReportRoutes.js` 端点 + `canvas_error_log` 表（G6 Backend-B 建表）；告警阈值：单画布 5 分钟内 >3 次错误触发通知 | G4 Frontend-A + G5 Backend-A + G6 Backend-B | P1 | 0.5d | B1.13, B3.5 |

> **验收标准**：用户在画布中拖入"图片生成→风格选择→结果展示"三个组件，连线后可在预览模式下完整执行。

---

## 4. B4 — 渐进迁移（1.5 周）

> **目标**：41 个 Pattern-A 页面分 3 批替换为配置驱动 | **风险**：中（分批迁移，每批独立验证可回退）

| # | 任务 | 负责组 | 优先级 | 预估 | 依赖 |
|---|------|--------|:--:|------|------|
| B4.1 | **第 1 批**（5 页）：color-change, style-transfer, text-effect, scene, product-render → 配置迁移（使用 B2.5a 脚手架提取 JSON 骨架，人工校准参数后写入配置） | G4 Frontend-A | P0 | 1d | B2, B2.5a |
| B4.2 | 第 1 批验收：对照原页面功能 + 回归测试 | G6 QA-Engineer | P0 | 0.5d | B4.1 |
| B4.3 | **第 2 批**（18 页）：remove-bg, white-bg, outpaint, retouch, ghost-mannequin 等单图上传类 → 配置迁移 | G4 Frontend-A | P0 | 2d | B4.2 |
| B4.4 | 第 2 批验收：对照原页面功能 + 回归测试 | G6 QA-Engineer | P0 | 0.5d | B4.3 |
| B4.5 | **第 3 批**（18 页）：swap-face, video-edit, action-transfer, voice-gen 等多输入/媒体类 → 配置迁移 | G4 Frontend-A | P0 | 2d | B4.4 |
| B4.6 | 第 3 批验收：全量回归 + 性能对比（配置版 vs 硬编码版） | G6 QA-Engineer | P0 | 0.5d | B4.5 |
| B4.7 | 清理：删除已迁移的旧硬编码页面文件 | G4 Frontend-A | P1 | 0.5d | B4.6 |
| B4.8 | 回退机制：每批迁移页面保留 `?useLegacy=1` 查询参数回退到硬编码版本，迁移后 2 周内旧文件不物理删除（仅路由重定向） | G5 Backend-A | P1 | 0.5d | B4.1 |
| B4.9 | Playwright E2E 测试：4 条核心路径 — ①拖入组件→配置属性→保存→重新加载验证 ②连线 3 个组件→预览模式执行管线→验证结果渲染 ③从模板加载→修改组件→另存为新画布→验证独立性 ④移动端 User-Agent → 验证只读预览+编辑入口隐藏+顶部提示条 | G6 QA-Engineer | P0 | 1d | B4.6, B3.18 |
| B4.9a | E2E 种子数据脚本：预创建 3 个测试画布（空画布/3 组件+连线/模板画布）+ mock 3 个 API 端点响应 fixture（正常/延迟/错误），供 B4.9 Playwright 测试使用 | G6 QA-Engineer | P1 | 0.5d | B4.9 |

> **验收标准**：41 个页面迁移完成后，功能无回归，配置版渲染性能不低于原版。新增同类页面从 2-4h 降至 15-30min。

---

## 5. 不纳入本阶段的内容（B5+）

以下能力已在数据模型中预留字段或已评估可行性，但**不在第一阶段 5 周核心周期内**：

| 能力 | 预留字段/准备 | 触发条件 |
|------|---------|---------|
| 事件/动作系统（click→弹窗/跳转/调API） | `DiySection.events` | 组件数 >30 且有交互配置需求 |
| 数据绑定（API返回→组件属性自动更新） | `DiySection.bindings` | 工作流组件间需要动态数据传递 |
| 自由布局（x/y/w/h 绝对定位） | `DiySection._style` | 用户反馈需要非流式布局 |
| SDK 封装（`@movio/canvas-sdk`） | 独立包 | 组件注册表稳定 + 有外部嵌入需求 |
| 实时协作编辑 | WebSocket | 企业版客户需求明确 |
| 组件渲染器版本化（renderer 视觉变更兼容） | — | 组件迭代导致旧画布视觉不一致 |
| 跨画布复制粘贴（Ctrl+C/V 组件到另一画布） | — | 用户反馈需要在多个画布间复用组件配置 |
| 组件缩略图预览（拖拽前悬浮预览） | 组件注册表 `thumbnail` 字段 | 组件数 >50 且用户反馈查找困难 |
| 画布配置导入/导出（JSON 文件） | — | 有跨账号/跨项目迁移需求 |
| 预设画布模板库（常见工作流开箱即用） | — | B4 迁移完成，41 个模板可沉淀 |
| 画布删除时关联资产清理（orphan image cleanup） | — | 存储空间告警 |
| 画布删除级联策略（模板解除关联/error_log 保留 30 天/上传图片由全局资产管理统一处理） | — | 用户删除画布后需要明确关联数据去向 |
| 管线 API 调用速率限制 | — | 管线执行量达到日均 1000+ |
| 编辑器自动保存（debounce 草稿） | — | 用户反馈丢失未保存编辑 |
| 画布缩放/平移（zoom in/out + pan，≥20 组件时需要） | — | 用户反馈大画布操作困难 |
| 网格/对齐吸附（snap-to-grid + 对齐参考线） | — | 用户反馈组件排列不整齐 |
| 多选组件（框选/Shift+点选，批量移动/删除/对齐） | — | 用户反馈逐组件操作效率低 |
| 画布整体克隆（一键复制整个画布配置到新画布） | — | 用户反馈需要画布版本分支 |
| Undo/Redo 操作反馈（底部 toast 提示"已撤销：删除组件X"） | — | 用户反馈不知道撤销了什么 |

---

## 6. 进度总览

```
B1 ████████████████░░░░ 1.5周  组件标准化地基
        ↓ (B1.4 CanvasRenderer 完成后可并行启动 B2)
B2 ██████████░░░░░░░░░░ 1.0周  工作台配置化
        ↓ (B2.7 验收通过后启动 B3)
B3 ██████████░░░░░░░░░░ 1.0周  画布接入工作台
        ↓ (B3.6 白名单通过后启动 B4)
B4 ███████████████░░░░░ 1.5周  渐进迁移
─────────────────────────────────
   合计：5.0 周核心周期
```

**关键依赖链**：
```
B1.1 → B1.2 → B1.2a (组件生命周期)
      ↘ B1.3 → B1.4 → {B1.6 + B1.9 + B1.15 + B3}
      ↘ B1.11 (schema 迁移工具)
      ↘ B1.10 → B1.10a → B1.14 (DB migration + 回滚 + 配置大小限制)
      ↘ B1.5 → B1.7 → B1.8
      ↘ B1.13 (ErrorBoundary，B1.4 完成后)
B1.3 + B1.4 + B1.9 + B1.11 + B1.13 + B1.15 → B1.12 (单元测试) → B1.16 (CI 管线)
B1.2 → B3.13 (默认三态占位组件，依赖注册表字段)
B2.1 → {B2.2, B2.3, B2.4, B2.5} → B2.5a (迁移脚手架)
      ↘ B2.7 (验证)
      ↘ B2.8 (i18n，可在 B2.2-B2.4 完成后并行)
      ↘ B2.9 (Storybook+基线，B2.2-B2.4+B2.7 全部完成后)
B1.4 + B1.9 + B2 完成 → {B3.1, B3.2} → B3.10 (搜索/筛选)
B3.1 + B3.2 → B3.3 → B3.4 → B3.4a → B3.5 → {B3.6, B3.11}
      ↘ B3.7 (编辑器改造，可与 B3.3 并行)
      ↘ B3.7a (快捷键，B3.7 完成后)
      ↘ B3.8 (a11y，B3.7 完成后)
      ↘ B3.8a (移动端只读，B1.4 完成后可并行)
      ↘ B3.12 (撤销持久化，B3.7 完成后)
      ↘ B3.14 (埋点，B3.7+B3.8a 完成后)
B3.6 + B1.8 → B3.9 (安全测试)
B3.1 + B3.7 → B3.15 (属性面板)
B3.7 → {B3.7a (快捷键), B3.7b (面包屑+路由), B3.16 (保存状态), B3.17 (暗黑模式)}
B1.13 + B3.5 → B3.18 (ErrorBoundary 上报 + 服务端端点 + 日志表)
B2 + B2.5a + B3.6 → B4.1 → B4.2 → B4.3 → B4.4 → B4.5 → B4.6 → B4.7
      ↘ B4.8 (回退机制，B4.1 完成后即可实施)
B4.6 + B3.18 → B4.9 → B4.9a (E2E 测试 + 种子数据)
```

**并行机会**：
- B1.6（Container 组件）与 B1.5（undo/redo）/ B1.9（拖拽）可并行
- B1.10（DB migration）与 B1.2-B1.4 可并行
- B2.2/B2.3/B2.4（控件+渲染器）可并行开发
- B3.1（包装器）与 B3.2（组件库分类）可并行
- B3.7（编辑器改造）与 B3.3（连线）可并行
- B3.15（属性面板）/ B3.16（保存状态）/ B3.17（暗黑模式）三者可在 B3.7 完成后并行推进
- B4 每批迁移是串行的（前一批验收后才开始下一批）

## 7. 每阶段完工定义 (DoD)

### B1 DoD
- [ ] 新组件注册到 registry → 画布自动渲染，无需改渲染器代码
- [ ] Grid 容器嵌套 3 层子组件正常渲染
- [ ] 组件可从组件库拖入画布，画布内跨容器拖拽正常
- [ ] 循环引用拖拽被拦截 + 提示
- [ ] 旧版扁平 sections 自动迁移到树形结构无数据丢失
- [ ] `diy_page` 表 `sections_tree` + `connections` 列可用
- [ ] DB migration 回滚脚本可用，备份快照表自动创建（B1.10a）
- [ ] `DiySectionPreview.vue` 中 12 个 `v-if` 分支清零
- [ ] undo/redo 支持 addChild/removeChild/move/reorder/updateConfig
- [ ] Zod 校验覆盖 sections 嵌套 children + connections 引用完整性
- [ ] ErrorBoundary 捕获子组件异常，崩溃组件显示占位卡片，不级联影响其他组件
- [ ] 画布空状态显示引导区（"拖入组件开始搭建"），非空白
- [ ] 配置保存前客户端预检 JSON 大小 >1MB 时拦截提示
- [ ] 从 registry 移除被引用的组件被阻止并提示引用计数
- [ ] 核心模块单元测试全部通过（B1.12）
- [ ] CI 管线（lint → 单元测试 → build → bundle size check）配置完成，PR 触发通过（B1.16）
- [ ] 编辑器首屏 JS bundle ≤500KB，bundle size check CI 告警就绪（B1.16）
- [ ] `npm run build` 通过，无类型错误

### B2 DoD
- [ ] 一份 JSON 配置渲染 color-change 完整工作流，满足 AC-3 三条可测量标准
- [ ] 6 个选项控件 + 2 个上传控件 + 5 个结果渲染器均可独立在 Storybook 中预览和交互
- [ ] color-change 页面 Lighthouse Performance 基线已记录（B2.9），用于 B4 对比
- [ ] 配置迁移脚手架扫描 Pattern-A 页面 → 输出 JSON 骨架，人工校准后可用
- [ ] 所有控件和渲染器的用户可见文案均已接入 `$t()` i18n
- [ ] `WorkPipelineConfig` 类型编译时覆盖所有必填字段
- [ ] `npm run lint` 通过

### B3 DoD
- [ ] 画布编辑器中拖入 "图片上传→风格选择→AI生成→图片展示" 四个组件
- [ ] 连线配置数据流后，预览模式下可完整执行并看到结果
- [ ] 管线中途失败时显示错误+重试，已完成步骤结果保留
- [ ] 工作流可保存为模板，可从模板重新加载
- [ ] API 端点白名单拦截非授权请求（安全测试通过）
- [ ] 安全测试通过：XSS 清洗、SSRF 拦截、配置注入拒绝、多租户隔离（B3.9）
- [ ] 组件库搜索框输入关键词实时过滤，分类 Tab 切换正常（B3.10）
- [ ] 并发保存冲突返回 409，提示用户刷新后重试（B3.11）
- [ ] 浏览器刷新/关闭时 beforeunload 弹窗 + 重开恢复撤销草稿（B3.12）
- [ ] 画布组件三态（loading/empty/error）统一视觉风格（B3.13）
- [ ] Ctrl+Z/Y/S/Delete/Escape 快捷键全量可用（B3.7a）
- [ ] 面包屑导航正常显示，移动端自动重定向到 /preview（B3.7b）
- [ ] 移动端只读预览正常，编辑工具栏隐藏（B3.8a）
- [ ] 画布拖拽区支持键盘操作（Tab/Enter/方向键/Delete）
- [ ] 组件库支持屏幕阅读器朗读
- [ ] 6 类埋点事件客户端采集+服务端接收正常（B3.14）
- [ ] 属性面板根据 propsSchema 自动渲染表单控件，修改属性后画布实时预览（B3.15）
- [ ] 保存状态指示器正确显示已保存/未保存/保存中三种状态（B3.16）
- [ ] 暗黑模式下画布所有面板可读、连线可见、拖拽高亮可辨识（B3.17）
- [ ] 运行时错误静默上报到服务端，`canvas_error_log` 表可查询，告警阈值生效（B3.18）

### B4 DoD
- [ ] 41 个页面全部迁移完成，功能无回归
- [ ] B2.5a 脚手架输出的 JSON 骨架经人工校准后可直接使用
- [ ] 配置版渲染性能不低于硬编码版（Lighthouse Performance 评分差异 ≤3 分，B4.6 实测）
- [ ] 新增同类页面耗时从 2-4h 降至 ≤30min
- [ ] 旧硬编码文件在迁移 2 周观察期后删除
- [ ] `?useLegacy=1` 回退机制可用，每批可独立回退
- [ ] 全量回归测试通过
- [ ] Playwright E2E 4 条核心路径全部通过（B4.9）
- [ ] E2E 种子数据脚本可独立运行，3 个画布 + 3 个 mock 端点就绪（B4.9a）

## 8. 各组任务量统计

| 组 | 任务数 | 总预估 |
|:--:|:--:|:--:|
| G4 Frontend-A | 30 | ~28d |
| G4 Frontend-B | 10 | ~7.5d |
| G3 UI-Designer | 8 | ~4.5d |
| G5 Backend-A | 10 | ~4.5d |
| G6 Backend-B | 8 | ~4d |
| G6 QA-Engineer | 9 | ~6d |
| G1 Security-Auditor | 2 | ~1d |
| **合计** | **59** | **~52.5d** |
