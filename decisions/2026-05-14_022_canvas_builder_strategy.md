# Decision 022 — 可视化画布落地策略定型

- **When**: 2026-05-14 CST
- **What**: 选定方案 B — 适度改造工作台硬编码 + 暂不引入独立 SDK，建设画布拼装能力
- **Why**:
  - 55 个工作台页面中 41 个（74.5%）共享同一骨架模板（上传→选参→生成→展示），样板代码占 65-70%
  - 通过建立 1 个通用 `WorkPipeline` 组件 + 6-8 个选项控件 + 5 个结果渲染器，41 个页面可缩减为 JSON 配置
  - 现有 DIY 系统（12 组件、完整 API、版本管理）可作为画布存储/模板基础设施
  - 方案 A（不改造硬编码）周期相同但只能搭落地页，无法覆盖 AI 工作流
  - 方案 B 同等周期（5 周）多交付 41 个可拼装 AI 工作流组件
- **Context**:
  - 现有 DIY 编辑器（`pages/diy/editor.vue`）可用但渲染器（`DiySectionPreview.vue`）需重构
  - `diy_custom_module` / `diy_custom_action` 两张表曾在 migration_003 创建后被标记 DEPRECATED — 团队历史上尝试过模块化+事件系统但放弃
  - 现有 `server/src/sdk/` 是 MemFocus AI 编排 SDK，与画布无关
  - SDK 引入判据：组件运行时内核稳定 + 组件数 >30 + 有对外嵌入需求时，再封装为 `@movio/canvas-sdk`
- **Architecture decisions**:
  - 画布数据模型：新建树形 Section（`children?: DiySection[]`），复用 `diy_page` 存储，新增 `sections_tree` JSON 列存储树形结构 + `connections` JSON 列存储连线关系，旧 `sections` 扁平字段保留兼容。`DiySection` 预留 `events`/`bindings` 字段给 B5+ 事件系统和数据绑定
  - 渲染内核：`Map<componentCode, VueComponent>` 注册表 + `<component :is>` 动态渲染，替代硬编码 `v-if`
  - 工作台：`WorkPipeline` 配置驱动组件，与画布共享同一注册表
  - 拖拽基建：复用已有 `DiySectionPreview.vue` 的拖拽排序逻辑，扩展为画布级跨容器拖拽（基于 HTML5 Drag & Drop API，不引入第三方 DnD 库）
  - 连线数据契约：`{ from: sectionId, fromPort: 'output', to: sectionId, toPort: 'input' }[]`，存储在画布配置顶层 `connections` 数组
  - 执行引擎：按连线拓扑排序，串行执行（v1.0 不做 DAG 并行），每步等待上一步 API 返回后将结果注入下游组件 props
  - 安全边界：画布配置 JSON 中引用的 API 端点需白名单校验（防 SSRF）；用户输入的文本内容统一经 DOMPurify 清洗（防存储型 XSS）；画布配置 JSON 在存储和加载时做 Zod schema 校验（防配置注入篡改）
  - 错误隔离：每个画布组件包裹 `<ErrorBoundary>`，单个组件渲染崩溃不影响画布其他组件（显示红色占位卡片 + "组件加载失败" + 错误摘要 + 重试按钮，不级联崩溃）
  - 画布配置大小：树形 sections + connections JSON 上限 1MB（MySQL LONGTEXT 安全范围），B1.10 migration 时设定 DB 约束；编辑器保存前客户端预检 JSON 大小，超限提示"配置过大，请减少组件数量"
  - 事件系统/数据绑定：第二阶段（B5）按需添加，不计入第一阶段核心周期
  - Undo/Redo 架构：命令模式（Command Pattern），每次操作生成 Operation 对象（`{ type, payload, inverse }`）推入栈，undo 时执行 inverse。v1.0 快照上限 60 级、内存 <50MB。撤销栈写入 sessionStorage 跨路由保持，beforeunload 弹窗保护未保存栈（B3.12）
  - 移动端只读模式：移动端画布不开放编辑（隐藏组件库+拖拽+连线+工具栏），仅渲染只读预览（`readonly` prop 传入 CanvasRenderer），编辑入口显示"请在桌面端打开以编辑画布"
  - 组件生命周期与移除策略：从 registry 移除组件时需检查是否有画布配置引用该 componentCode，有则阻止移除并提示"X 个画布正在使用此组件，请先迁移或删除相关画布配置"。废弃组件标记 `deprecated: true` 保留 registry 占位但编辑器组件库不显示，已有画布仍可渲染但工具栏标注"（已废弃）"
  - 画布空状态：新画布无组件时显示居中引导区（"拖入组件开始搭建" + 组件库快捷入口），非空白
  - 属性面板：右侧动态属性面板 `<PropertyPanel>`，根据 registry 中 `propsSchema` 自动渲染对应表单控件（文本→input、枚举→select、颜色→color picker、布尔→switch、图片→upload preview），无需为每个组件手写属性编辑 UI。选中画布组件时面板显示，未选中时显示画布级设置
  - 脏状态跟踪：画布编辑器标题栏显示保存状态指示器（●已保存 / ●未保存 / ●保存中…），与 B3.12 的 beforeunload + sessionStorage 形成双层保护
  - 暗黑模式：画布编辑器、组件库、属性面板、CanvasRenderer 全部跟随项目现有 CSS 变量主题系统（`design-tokens.css`），不引入独立的画布暗黑样式
  - E2E 测试：Playwright 覆盖 4 条核心路径（拖入组件→配置→保存、连线→执行管线→查看结果、模板加载→修改→另存、移动端只读预览），不追求全覆盖，只保核心链路不回归
  - CI/CD 集成：画布单元测试 + E2E 测试接入 GitHub Actions（或项目现有 CI），每次 PR 触发；Storybook 部署到静态站点供 UI 审查
  - 运行时错误监控：`ErrorBoundary` 捕获异常后通过 `navigator.sendBeacon` 上报到服务端 `/api/canvas/error-report` 端点（含 componentCode + error.message + error.stack + timestamp + canvasId），服务端写入日志表供告警和排查。不影响用户体验（静默上报）
  - 画布路由设计：画布页面路由 `/canvas/:id`（编辑模式，桌面端）和 `/canvas/:id/preview`（只读预览，移动端自动重定向至此）。不引入新的顶级路由模块，画布路由注册在现有 `client/pages/` 下作为独立页面组。B4 迁移完成后的 41 个配置版页面路由由 `WorkPipeline` 统一接管，旧路由保留重定向
  - DB 迁移策略：每次 migration 同时提供 forward 和 rollback 脚本。B1.10 forward 新增 `sections_tree` + `connections` 列，rollback 删除此二列（数据不保留）。迁移前自动备份 `diy_page` 表到 `diy_page_backup_YYYYMMDD` 快照表
  - 多租户数据隔离：画布 DAO 层所有查询必须带 `tenant_id` WHERE 条件。复用现有 `diyDao` 的租户隔离机制（现有 DIY 系统已实现），新增的画布特定查询（sections_tree 读写、connections 查询、执行引擎服务端校验）需在 `diyDao` 中扩展且遵循同一租户隔离模式。QA 需专项验证跨租户数据不可见
  - 组件异步加载：组件注册表中 renderer 字段使用 `defineAsyncComponent(() => import('./path.vue'))` 懒加载，避免编辑器首次加载时 53+ 组件全量打入主 bundle。组件库面板采用虚拟滚动渲染组件列表（≤20 个可见项），其余按需加载
- **Related files**:
  - *需改造的现有文件*：
  - `client/components/DiySectionPreview.vue` — 需重构为动态注册表
  - `client/composables/useDiyEditor.ts` — 需扩展支持树形结构
  - `client/composables/useDiyComponents.ts` — 静态常量需升级为动态注册
  - `client/types/diy.ts` — 需扩展 children/events/bindings/connections 字段
  - `client/pages/diy/editor.vue` — 需扩展左侧组件库面板、画布拖拽区
  - `server/src/dao/diyDao.js` — 存储层可复用，需扩展树形 sections 读写
  - `server/sql/migration_003_form_enhance.sql` — 废弃的 custom_module/action 参考
  - *计划新建的文件*：
  - `client/components/CanvasRenderer.vue` — 树形递归渲染内核
  - `client/components/ErrorBoundary.vue` — 单组件崩溃隔离
  - `client/components/PropertyPanel.vue` — 动态属性编辑面板（基于 propsSchema 渲染表单）
  - `client/components/WorkPipeline.vue` — 通用工作流骨架组件
  - `client/components/canvas/` — 6 选项控件 + 2 上传控件 + 5 结果渲染器
  - `client/composables/useCanvasDragDrop.ts` — HTML5 DnD 拖拽基建
  - `client/composables/useCanvasExecution.ts` — 执行引擎（拓扑排序串行管线）
  - `client/composables/useCanvasUndoRedo.ts` — 命令模式撤销重做引擎
  - `client/types/canvasComponent.ts` — 画布组件接口契约
  - `client/types/workPipeline.ts` — WorkPipeline 配置类型
  - `server/src/config/canvasApiWhitelist.js` — API 白名单配置
  - `server/src/services/canvasExecutionService.js` — 管线执行后端校验
  - `server/sql/migration_004_canvas_sections.sql` — diy_page 树形列扩展
  - `server/src/services/schemaMigrationService.js` — 组件 schema 升级兼容迁移
  - `client/e2e/canvas/` — Playwright E2E 测试（4 条核心路径）
  - `.github/workflows/canvas-ci.yml` — 画布 CI 管线（lint + unit + e2e）

---

## 方案对比矩阵

| 维度 | 方案 A（不改造+不引入SDK） | **方案 B（适度改造+暂不SDK）✅** |
|------|--------------------------|--------------------------------|
| **核心周期** | ~5 周 | ~5 周 |
| **画布能力范围** | 仅落地页（12 组件） | 落地页 + AI 工作流（53 组件） |
| **工作台组件化** | 不改造 | 41 页面配置化 |
| **重复代码消除** | 0% | 65-70% |
| **新增 AI 功能耗时** | 2-4h（写 SFC） | 15-30min（写 JSON） |
| **画布对 AI 流的覆盖** | 0%（只能搭 Banner） | 100% |
| **对现有业务影响** | 零影响 | 分批迁移，每批独立可回退 |
| **长期技术债** | 55 页面持续膨胀 | 新增功能天然配置化 |
| **SDK 引入点** | 无 | B1-B4 后按需评估 |

---

## 风险评估

| 风险 | 概率 | 影响 | 缓解措施 | 责任人 |
|------|:--:|:--:|---------|--------|
| B1.4 CanvasRenderer 递归渲染性能不达标 | 低 | 中 | 虚拟滚动 + `shallowRef` 大组件；50 组件 <500ms 硬指标 | G4 Frontend-A |
| B3.3 组件连线交互复杂度超预期 | 中 | 中 | 先做"顺序连线"（串行），不做 DAG（有向无环图），降低复杂度 | G4 Frontend-B |
| B4 迁移过程发现遗漏页面 | 中 | 低 | 每批迁移前全量 grep 确认 Pattern-A 页面无遗漏 | G6 QA |
| 工作台与画布共存的菜单/路由混乱 | 低 | 低 | 迁移完成前：新旧页面共存；迁移完成后：旧路由保留 redirect | G5 Backend-A |
| 组件注册表键名冲突 | 低 | 中 | 注册时检测重复 code，throw early | G4 Frontend-B |
| 数据库迁移（旧 sections→树形）数据丢失 | 极低 | 高 | 迁移脚本保留原字段 1 周，确认无问题后再删除 | G6 Backend-B |
| 单个组件渲染崩溃级联影响整个画布 | 中 | 高 | 每个组件包裹 `<ErrorBoundary>`，崩溃时显示占位卡片+重试，隔离故障 | G4 Frontend-A |
| 树形 sections + connections JSON 超过 MySQL JSON 列上限 | 低 | 高 | 预设 1MB 上限（50 组件+连线约 200KB 远低于此），保存前客户端预检 | G6 Backend-B |
| 同一画布被多人同时编辑，后者保存覆盖前者 | 低 | 中 | 保存时比对 `updated_at` 乐观锁，冲突时提示"已被他人修改，请刷新后重试" | G5 Backend-A |
| 用户拖拽容器组件到自身子级形成循环引用 | 中 | 高 | `useCanvasDragDrop` 拖入前检查目标是否为拖拽源的后代，是则阻止 drop + 提示"不能将组件放入自身内部" | G4 Frontend-A |
| 从 registry 移除组件导致已有画布白屏 | 低 | 高 | 移除前扫描画布配置引用计数，有引用则阻止并提示；废弃组件标记 `deprecated` 保留 registry 占位 | G4 Frontend-B |
| 画布核心链路无 E2E 覆盖，重构时回归风险高 | 中 | 高 | Playwright 覆盖 4 条核心路径（拖入→配置→保存 / 连线→执行→查看 / 模板→修改→另存 / 移动端只读），每次 PR 触发 | G6 QA-Engineer |
| G4 Frontend-A 单人负载过高（30 任务 ~28d），可能成为瓶颈 | 中 | 中 | B1.9/B3.3/B3.15 三个高复杂度任务可由 Frontend-B 承接；B2.5a 脚手架脚本可提前启动 | G2 Orchestrator |
| DB migration 缺少回滚脚本，生产环境迁移失败无法快速恢复 | 低 | 高 | 每次 migration 同时提供 forward + rollback 脚本；迁移前自动备份 `diy_page` → `diy_page_backup_YYYYMMDD` 快照表 | G6 Backend-B |
| E2E 测试无种子数据，测试环境每次需手动创建画布 | 中 | 中 | B4.9 前置 B4.9a：seed 脚本预创建 3 个画布（空画布/3 组件+连线/模板画布）+ mock API 响应 fixture | G6 QA-Engineer |
| 画布路由与现有 55 个工作台路由冲突或菜单层级混乱 | 低 | 中 | 画布路由 `/canvas/:id` 独立于工作台路由 `/work/*`；菜单中画布作为独立一级入口；B4 迁移完成后旧路由保留 2 周后 redirect | G5 Backend-A |
| 画布 DAO 层新增查询遗漏 tenant_id 过滤导致跨租户数据泄露 | 低 | 极高 | 复用现有 `diyDao` 租户隔离模式；新增查询 Code Review 必检 tenant_id WHERE 条件；QA 安全测试专项验证跨租户隔离 | G6 Backend-B + G1 Security-Auditor |
| 53+ 组件同步注册导致编辑器首屏 bundle 过大（>500KB JS） | 中 | 中 | 注册表 renderer 使用 `defineAsyncComponent` 懒加载；组件库面板虚拟滚动 ≤20 可见项；B1.16 CI 管线增加 bundle size check | G4 Frontend-A |

---

## 被否决的方案

| 方案 | 否决原因 |
|------|---------|
| 引入独立 SDK（`@movio/canvas-sdk`）作为前置 | 运行时内核未建，SDK 无地基；当前无跨项目复用需求 |
| 全量"大爆炸"式一次迁移 41 页面 | 回退成本极高，一个 bug 影响 41 页面 |
| 重写 DIY 系统（放弃现有 12 组件） | 浪费已有资产，DIY 存储/版本/API 可复用 |
