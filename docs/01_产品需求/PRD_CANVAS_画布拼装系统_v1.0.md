# PRD-CANVAS-001 — 可视化画布拼装系统（方案 B）

> **版本**: v1.8 | **日期**: 2026-05-14 | **作者**: G2 Product-Manager
> **状态**: 方案评估完成，待启动开发

---

## 1. 作用域边界

**v1.0 明确包含**：
- 12 个现有 DIY 落地页组件 + 画布编辑能力
- 41 个 Pattern-A 工作台页面的配置化迁移
- 画布拖拽拼装 AI 工作流（上传→选参→调用→展示）
- 树形嵌套容器（Grid/Flex/Tabs/Collapse，≤3 层）
- 模板保存/加载、undo/redo（60 级）
- 动态属性面板（基于组件 propsSchema 自动渲染表单控件）
- 保存状态指示器（已保存/未保存/保存中）
- 暗黑模式完整兼容

**v1.0 明确排除**：
- 自由布局（x/y/w/h 绝对定位）— 保留到 B5+
- 第三方外部嵌入（iframe SDK）— B5+ 触发
- 实时协作编辑（WebSocket 多人协同）— B5+ 触发
- 自定义代码/脚本注入 — 永久排除（安全红线）
- 14 个非 Pattern-A 页面（compliance-check, prompt-hub, brand-settings, marketplace, usage, diy-pages, batch, output, my-templates, size-templates, compare, main-image, cut-ecosystem, detail-h5）迁移 — 保留原样，与画布系统在同一菜单下共存，其 API 端点不纳入画布白名单（仅 pattern-A 页面 API 在白名单内），用户无法在画布中拼装这些页面的功能

---

## 2. 背景与目标

**为什么做**：当前 Movio AI 有 55 个工作台页面（图片生成/视频合成/文案创作等）全是硬编码 Vue SFC，用户无法自定义工作流。同时已有的 DIY 系统（12 个落地页组件）只能搭 Banner 和表单，无法拼装 AI 能力。

**目标**：让用户像搭积木一样，在画布上拖拽组合 AI 工作流组件（上传→选参→调用 AI→展示结果），实现"零代码搭建自己的 AI 工具链"。

---

## 用户故事

1. **作为电商运营**，我想要在画布上拖入"图片上传"→"风格选择"→"AI 生成"三个组件，拼成我的专属商品图生成流，以便每次只需一键就能批量出图
2. **作为跨境卖家**，我想要组合"翻译"→"合规检查"→"多平台发布"的工作流，以便一次操作完成全流程
3. **作为设计师**，我想要把常用参数保存为组件预设，以便团队其他成员可以直接使用
4. **作为移动办公的运营**，我想要在手机上查看已搭建的画布工作流运行状态，但不编辑，以便随时了解任务进度

---

## 功能描述

### B1 — 组件标准化地基（1.5 周）

```
目标：建立画布运行时内核，零业务影响
```

1. **组件注册表** — `Map<componentCode, { renderer: Component, propsSchema, defaultConfig }>`
   - 所有可画布操作的组件在此注册
   - 替代 `DiySectionPreview.vue` 的 12 分支硬编码
2. **树形 Section 模型** — `DiySection` 新增 `children?: DiySection[]`、`_schemaVersion: number`
   - 支持容器组件（Grid/Flex/Tabs/Collapse）
   - 限制嵌套深度 ≤3 层
   - `_schemaVersion` 用于组件 propsSchema 升级时的兼容迁移
3. **CanvasRenderer 渲染器** — 用 `<component :is="registry[code]">` 动态渲染

### B2 — 工作台配置化（1 周）

```
目标：41 个工作台页面从硬编码变为配置驱动
```

1. **WorkPipeline 通用组件** — 一个组件替代 41 个页面的骨架
   - 上传区（dropzone + 预览 + 上传状态）
   - 选项区（动态控件渲染）
   - 结果区（进度/成功/失败/重做）
2. **6-8 个选项控件** — select_card_grid, tag_chips, color_picker, text_input, slider, language_selector, image_upload, dual_upload
3. **5 个结果渲染器** — single_image, image_compare, image_grid, text_output, audio_player

### B3 — 画布接入工作台（1 周）

```
目标：B2 的工作台组件注册到画布，可在画布中拖拽组合
```

1. work pipeline 组件标准包装为画布组件
2. 画布编辑器支持选择"AI 工作流"组件类型
3. 组件间连线表示数据流（上传组件输出→生成组件输入→结果组件展示）
   - **连线数据契约**：`connections: [{ from: sectionId, fromPort: 'output', to: sectionId, toPort: 'input' }]`
   - **执行模型**：按连线拓扑排序串行执行，上游 API 返回后结果注入下游组件 props，再触发下游调用
4. **画布拖拽交互**：基于 HTML5 Drag & Drop API，支持组件库→画布拖入、画布内跨容器拖拽、拖拽时容器高亮 drop zone

### B4 — 渐进迁移（1.5 周）

```
目标：41 个页面分 3 批迁移，每批独立验证
```

- **第 1 批**（5 个最简页面）：color-change, style-transfer, text-effect, scene, product-render
- **第 2 批**（18 个单图上传类）：remove-bg, white-bg, outpaint, retouch, ghost-mannequin 等
- **第 3 批**（18 个多输入/媒体类）：swap-face, video-edit, action-transfer, voice-gen 等

---

## 验收标准

### AC-1 — 组件注册表
- Given 开发者定义了新组件（code + renderer + propsSchema）
- When 将组件注册到 registry Map
- Then 画布编辑器自动识别并可拖拽使用，无需修改渲染器代码

### AC-2 — 树形嵌套
- Given 画布上有一个 Grid 容器组件
- When 拖入子组件到容器内
- Then 子组件按 Grid 列数排列，序列化配置包含 children 关系

### AC-3 — 工作台配置化
- Given 一个"上传→选风格→生成"类页面（以 color-change 为基准）
- When 用 JSON 配置描述其上传类型、选项列表、API 端点、结果类型
- Then WorkPipeline 组件自动渲染完整工作流，且满足：① 所有交互控件可操作（可点击/可选择/可输入）② 上传→生成→展示完整链路跑通 ③ 错误状态（上传失败/API超时/结果为空）均有对应 UI 反馈

### AC-4 — 画布拖拽 AI 工作流
- Given 用户在画布编辑器中
- When 从组件库选择"图片生成"→"风格选择"→"结果展示"拖入
- Then 三者可连线配置数据流，预览模式下可完整执行
- Given 组件库中包含 53+ 个可拖拽组件
- When 用户在组件库搜索框输入关键词（如"图片"、"视频"、"风格"）
- Then 组件列表实时过滤，仅显示匹配项，支持按分类 Tab 筛选

### AC-5 — 边界与容错
- Given 画布配置中引用了不在白名单内的 API 端点
- When 尝试执行该工作流
- Then 拦截并提示"未授权的 API 端点"，不发起请求（防 SSRF）
- Given 用户拖入超过 50 个组件到画布
- When 画布渲染
- Then 渲染耗时 <500ms，undo 栈仍保持 60 级深度，不触发内存溢出
- Given 树形嵌套深度达到 4 层
- When 尝试继续拖入子组件
- Then 提示"已达到最大嵌套层级（3层）"，阻止操作
- Given 移动端访问画布页面
- When 尝试进入编辑模式
- Then 仅开放只读预览，隐藏编辑工具栏
- Given 用户保存画布配置时在组件标题中输入 `<script>alert(1)</script>`
- When 配置存储到数据库
- Then 存储前经 DOMPurify 清洗为纯文本，加载渲染时不执行任何脚本
- Given 恶意用户手动构造画布配置 JSON（包含不在 registry 中的 componentCode 或超出白名单的 API 端点）
- When 加载该配置
- Then Zod schema 校验拒绝非法 componentCode，API 白名单拦截非授权端点，配置加载失败并提示"配置包含无效内容"
- Given 一个 5 步串行管线在第 3 步执行失败（如 API 超时/返回错误）
- When 管线中断
- Then 前 2 步结果保留可见，第 3 步显示错误信息 + 重试按钮，第 4-5 步显示"等待上游完成"，用户可一键重试失败步骤
- Given 已保存的画布配置引用了某组件的旧版 propsSchema
- When 该组件 schema 已升级（新增/删除/重命名字段）
- Then 加载时执行兼容迁移：新增字段填 defaultConfig 默认值，删除字段忽略，重命名字段通过 `migrations` 映射表自动转换。迁移后提示"配置已自动升级"或"配置包含不兼容字段，请手动调整"
- Given 画布上某个组件因代码缺陷渲染崩溃
- When 该组件抛出未捕获异常
- Then `<ErrorBoundary>` 捕获异常，该组件位置显示红色占位卡片（含组件名称、错误摘要、"重试"按钮），画布其余组件正常运行不受影响
- Given 用户保存的树形 sections + connections 序列化后超过 1MB
- When 点击保存
- Then 客户端预检拦截，提示"画布配置过大（当前 X MB，上限 1 MB），请减少组件数量"，阻止保存
- Given 用户 A 和用户 B 同时打开同一画布编辑
- When 用户 A 先保存成功，用户 B 随后尝试保存
- Then 服务端比对 `updated_at` 乐观锁，返回 409 Conflict 提示"画布已被他人修改，请刷新后重试"，用户 B 的修改不覆盖 A 的保存
- Given 用户正在编辑画布（有未保存的撤销历史）
- When 误触浏览器后退/刷新/关闭标签页
- Then 浏览器 `beforeunload` 弹窗提示"有未保存的更改，确定离开吗？"，且 sessionStorage 保留撤销栈草稿，重新打开时可恢复
- Given 画布上一个组件的数据源 API 返回空数组
- When 组件渲染
- Then 显示统一的"暂无数据"占位状态（非空白），与其他组件的 loading/error 状态视觉风格一致

### AC-6 — 迁移回退（B4）
- Given 第 N 批页面已迁移为配置驱动
- When 验收发现功能回归
- Then 可单独回退该批次到原硬编码版本，不影响其他批次
- Given 用户在配置版页面上创建了新数据
- When 通过 `?useLegacy=1` 回退到硬编码版
- Then 硬编码版仍可正常访问该数据（数据模型不变，仅前端渲染方式变化），功能完整可用

### AC-7 — 编辑体验与组件生命周期
- Given 用户正在画布编辑器中操作
- When 按下 Ctrl+Z / Ctrl+Y
- Then 撤销/重做上一步操作（拖入/删除/移动/连线/配置修改均纳入撤销栈），撤销深度 60 级
- Given 用户选中画布上的组件后按 Delete 键
- When 组件不是最后一个
- Then 组件从画布删除，undo 栈记录操作可撤销恢复；画布仅剩 1 个组件时 Delete 阻止删除并提示"画布必须至少保留 1 个组件"
- Given 用户尝试拖拽容器组件 A 到 A 的子组件 B 内部
- When drop 目标检测到循环引用（B 是 A 的后代）
- Then 阻止 drop + toast 提示"不能将组件放入自身内部"，拖拽源回到原位
- Given 开发者将 registry 中某组件标记为 `deprecated: true`
- When 打开画布编辑器组件库
- Then 该组件不在组件库面板中显示（不可新拖入），但已有画布中该组件仍正常渲染，其工具栏显示"（已废弃）"标签
- Given 开发者尝试从 registry 中完全删除某组件
- When 系统扫描发现至少 1 个画布配置引用了该 componentCode
- Then 阻止删除并提示"X 个画布正在使用此组件，请先迁移或删除相关画布配置"
- Given 用户新创建画布，未拖入任何组件
- When 画布渲染
- Then 显示居中引导区："拖入组件开始搭建你的 AI 工作流" + "打开组件库"按钮，非空白
- Given 移动端打开画布页面
- When 页面加载
- Then 显示画布工作流的只读预览（组件渲染正常、执行结果可见），编辑工具栏/组件库/拖拽区全部隐藏，顶部提示"移动端仅支持预览，请在桌面端编辑"
- Given 用户选中画布上的某个组件
- When 右侧属性面板打开
- Then 面板根据该组件在 registry 中的 propsSchema 自动渲染对应表单控件：`string` → 文本输入框、`enum` → 下拉选择器、`color` → 颜色选择器、`boolean` → 开关切换、`image` → 图片上传预览。修改属性后面板标记为脏，画布组件实时预览更新
- Given 用户对画布做了修改但尚未保存
- When 查看编辑器标题栏
- Then 保存状态指示器显示"● 未保存"（橙色圆点），保存成功后变为"● 已保存"（绿色圆点），保存进行中显示"◌ 保存中…"（灰色旋转）
- Given 系统处于暗黑模式
- When 打开画布编辑器
- Then 画布区、组件库面板、属性面板、连线 SVG、拖拽 drop zone 高亮、空状态引导区、ErrorBoundary 占位卡片全部跟随暗黑主题色，无硬编码颜色导致的不可读或刺眼问题
- Given 画布核心功能（拖入/配置/保存/连线/执行/模板/移动端预览）已部署到测试环境
- When CI 管线触发 Playwright E2E 测试（依赖 B4.9a 种子数据脚本：预创建 3 个画布 + mock 3 个 API 端点响应 fixture）
- Then 4 条核心路径全部通过：①拖入组件→配置属性→保存→重新加载验证 ②连线 3 个组件→预览模式执行→验证结果渲染 ③从模板加载→修改→另存为新画布 ④移动端 User-Agent 访问→验证只读预览+编辑入口隐藏
- Given 画布上某组件 `<ErrorBoundary>` 捕获到运行时异常
- When 异常发生
- Then 组件显示红色占位卡片（用户可见），同时 `navigator.sendBeacon` 静默上报到 `/api/canvas/error-report`（含 componentCode + error.message + error.stack + timestamp + canvasId），不影响用户继续操作画布其他组件
- Given 用户通过菜单进入画布编辑器
- When 画布页面加载
- Then 顶部显示面包屑导航：工作台 > 画布编辑器 > [画布标题]，每级可点击跳转。画布标题栏显示可编辑的画布名称（默认"未命名画布"）
- Given 用户通过 URL `/canvas/:id` 访问已存在的画布
- When 页面加载
- Then 桌面端进入编辑模式，移动端自动重定向到 `/canvas/:id/preview` 只读模式
- Given DB migration B1.10 执行后需要回滚
- When 执行回滚脚本
- Then `sections_tree` + `connections` 列被删除，`diy_page_backup_YYYYMMDD` 快照表保留原始数据可手动恢复。回滚后画布编辑器降级使用旧 `sections` 扁平字段
- Given 用户 A（tenant=X）和用户 B（tenant=Y）分别创建了画布
- When 用户 A 通过 API 查询画布列表
- Then 仅返回 tenant=X 的画布，用户 B 的画布不可见。直接访问用户 B 的画布 ID URL 返回 404（租户隔离验证）
- Given 画布编辑器首次加载
- When 打开包含 53+ 注册组件的编辑器
- Then 组件渲染器按需异步加载（`defineAsyncComponent`），首屏 JS bundle ≤500KB。组件库面板仅渲染可见区域 ≤20 个组件项（虚拟滚动）
- Given 用户删除一个画布页面
- When 确认删除
- Then 画布配置（`diy_page` 记录）被删除，关联的模板记录解除关联（不删除模板本身），`canvas_error_log` 中的历史日志保留 30 天后自动清理。画布中上传的图片资产不随画布删除而清理（由全局资产管理统一处理）

---

## 优先级：P0（战略级）

**理由**：这是 Movio AI 从"工具集合"升级为"平台"的核心差异化能力。竞品（Canva、稿定设计）已有画布拼装但无 AI 工作流拼装，这是窗口期。

---

## 埋点需求

| 埋点名称 | 类型 | 触发时机 | 业务指标 |
|---------|------|---------|---------|
| canvas_component_add | 行为 | 拖入组件到画布 | 组件使用热度 |
| canvas_pipeline_create | 行为 | 用户创建新工作流 | 画布激活率 |
| canvas_pipeline_execute | 行为 | 用户执行画布工作流 | 工作流执行量 |
| canvas_template_save | 行为 | 保存为模板 | 模板贡献率 |
| workbench_page_migrated | 页面 | 硬编码页面被配置替代 | 迁移进度 |
| canvas_mobile_view | 页面 | 移动端访问画布预览 | 移动端使用率 |
| canvas_component_deprecated | 系统 | 从 registry 废弃组件被扫描到引用 | 组件健康度 |
| canvas_error_report | 系统 | ErrorBoundary 捕获异常并上报 | 画布运行时稳定性 |
| canvas_e2e_pass | 系统 | CI 管线 E2E 测试通过/失败 | 画布核心链路健康度 |

> 埋点实现见任务：B3.14（客户端埋点字段标准化 + 服务端事件采集）

---

## 非功能需求

- **性能**：画布渲染 50 个组件目标 <500ms（基于 Vue 3 `<component :is>` 基准估算，B1.4 完成后实测校准），undo/redo 深度 60 级内存目标 <50MB。画布编辑器首屏 JS bundle ≤500KB（53+ 组件通过 `defineAsyncComponent` 按需懒加载）。组件库面板虚拟滚动 ≤20 可见项。Lighthouse Performance 评分对比基线：迁移前对 color-change 页面实测作为基线值，迁移后该页面配置版评分差异 ≤3 分（B2.7 阶段建立基线并记录到测试报告中）
- **安全**：画布配置中引用的 API 端点需白名单校验，禁止 SSRF。白名单初始来源：扫描 `server/src/route/` 下所有已注册路由，自动生成初始白名单，后续新增端点需在 `canvasApiWhitelist.js` 中显式注册。用户输入的文本内容（组件标题、占位符、描述等）存储前经 DOMPurify 清洗（防存储型 XSS）。画布配置 JSON 加载时做 Zod schema 校验后解析（防配置注入篡改）。画布 DAO 层所有查询必须带 `tenant_id` WHERE 条件，复用现有 `diyDao` 租户隔离模式，QA 安全测试验证跨租户数据不可见
- **兼容**：移动端画布只读预览，不支持编辑。桌面端支持 Chrome 90+、Firefox 90+、Safari 15+、Edge 90+（HTML5 Drag & Drop API 兼容范围）。暗黑模式：画布编辑器及所有子面板完整支持项目现有暗黑主题（基于 `design-tokens.css` CSS 变量），不引入独立样式
- **存储**：单个画布配置 JSON（sections_tree + connections）上限 1MB，B1.10 DB migration 设定约束，编辑器保存前客户端预检。每次 DB migration 同时提供 forward 和 rollback 脚本，迁移前自动备份目标表到 `{table}_backup_YYYYMMDD` 快照表
- **路由**：画布页面路由 `/canvas/:id`（编辑模式）和 `/canvas/:id/preview`（只读预览），独立于现有 `/work/*` 路由体系。B4 迁移完成后旧硬编码页面路由保留 2 周观察期后 redirect 到配置版。画布编辑器内顶部显示面包屑导航（工作台 > 画布编辑器 > [画布标题]），每级可点击跳转
- **可观测性**：画布运行时错误通过 `navigator.sendBeacon` 静默上报到服务端 `/api/canvas/error-report`，服务端写入 `canvas_error_log` 表（字段：componentCode, errorMessage, errorStack, canvasId, userId, timestamp），用于告警阈值（单画布 5 分钟内 >3 次错误触发通知）和问题排查
- **CI/CD**：画布单元测试 + E2E 测试接入项目 CI 管线（每次 PR 触发），Storybook 部署到静态站点供 UI 审查
