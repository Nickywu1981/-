# Movio AI — UI 设计规范文档

> **编写组**：G3 UI 设计组（UI-Designer 🔴主 / Doc-Writer 🟡辅）
> **审核组**：G1 架构规划组（Architect）
> **版本**：v1.7 | **日期**：2026-05-14

---

## 一、品牌视觉体系

### 1.1 品牌主色（暖靛蓝 Warm Indigo）

| 色阶 | 色值 | 用途 |
|------|------|------|
| 50 | `#f0f0fd` | 浅靛背景/sidebar选中 |
| 100 | `#e0dffb` | 卡片悬停 |
| 200 | `#c4c2f7` | 品牌边框 |
| 300 | `#a5a2f2` | 品牌软色 |
| 400 | `#8b87ed` | 输入框聚焦 |
| 500 | `#7b77e8` | 次要按钮/链接 |
| 600 | **`#5b5fe3`** | **品牌主色/主按钮/Logo** |
| 700 | `#4a4ecf` | hover 加深 |
| 800 | `#3b3eb5` | active 按下 |
| 900 | `#2d3091` | 深靛强调 |

### 1.2 语义色

| 用途 | 色值 | CSS 变量 |
|------|------|------|
| 成功 | `#10B981` | `--success` |
| 警告 | `#F59E0B` | `--warning` |
| 错误 | `#EF4444` | `--danger` |
| 信息 | `#3B82F6` | `--info` |

### 1.3 中性色（暗黑模式自适应）

| 色阶 | 亮色 | 暗黑 | 用途 |
|------|------|------|------|
| 25 | `#fafaf9` | `#0a0c14` | 页面背景 |
| 50 | `#f5f5f4` | `#141724` | 卡片背景/hover |
| 100 | `#ebebea` | `#1a1d2e` | 边框/分隔 |
| 200 | `#d6d5d4` | `#1e2235` | 强边框 |
| 400 | `#9d9da3` | `#5d6380` | 辅助文字 |
| 600 | `#5b6178` | `#8b90a5` | 次要文字 |
| 900 | `#0f121e` | `#e8eaf0` | 正文/标题 |

---

## 二、布局规范

### 2.1 断点

| 名称 | 宽度 | 侧边栏 | 栅格 |
|------|------|:--:|------|
| **Mobile** | < 768px | 隐藏 | 1 列 |
| **Tablet** | 768-1023px | 200px | 2 列 |
| **Desktop** | ≥ 1024px | 240px | 灵活 |
| **Wide** | ≥ 1280px | 240px | 最大 1400px |

### 2.2 间距体系（4px 基准）

| Token | CSS 变量 | 值 | 用途 |
|------|------|------|------|
| `1` | `--space-1` | 4px | 图标/文字间距 |
| `2` | `--space-2` | 8px | 组件内部间距 |
| `3` | `--space-3` | 12px | 表单项间距 |
| `4` | `--space-4` | 16px | 卡片内边距（移动端）|
| `5` | `--space-5` | 20px | 卡片内边距（平板）|
| `6` | `--space-6` | 24px | 区块间距/卡片内边距 |
| `8` | `--space-8` | 32px | 页面大区块 |
| `10` | `--space-10` | 40px | Section 间距 |
| `12` | `--space-12` | 48px | Hero 区上下 |
| `16` | `--space-16` | 64px | 页面级分隔 |

### 2.3 全局布局模板

```
┌────────────────────────────────────────┐
│       ① 顶部导航栏 (56px)              │
├──────┬─────────────────────────────────┤
│      │                                 │
│ ②左侧│     ③ 主内容区                  │
│ 侧边 │     max-w-[1200px]              │
│ 栏   │     mx-auto                     │
│ 240px│                                 │
│      │                                 │
├──────┴─────────────────────────────────┤
│       ④ 底部栏 (可选)                  │
└────────────────────────────────────────┘
```

---

## 三、组件规范

### 3.1 按钮（CSS class 体系）

| 类型 | Class | 用途 |
|------|------|------|
| 主按钮 | `.btn .btn-primary` | 主要操作 |
| 次按钮 | `.btn .btn-secondary` | 次要操作 |
| 危险按钮 | `.btn .btn-danger` | 删除操作 |
| 成功按钮 | `.btn .btn-success` | 确认操作 |
| 幽灵按钮 | `.btn .btn-ghost` | 表格内操作 |
| 渐变按钮 | `.btn .btn-gradient` | Hero CTA |

尺寸：`.btn-sm`(32px) / `.btn-md`(40px) / `.btn-lg`(48px)

### 3.2 输入框（CSS class 体系）

```
默认：.input（40px 高，8px 圆角，border + focus-ring）
错误：border-danger
禁用：opacity-0.5 bg-surface-hover
标签：.label（13px/500）+ .hint（11px 辅助文字）
错误文字：.error-text（11px/danger）
```

### 3.3 卡片（CSS class 体系）

```
标准卡：.card（bg-surface + border + 12px 圆角 + 24px 内边距 + shadow-sm）
悬停卡：.card .card-hover（hover 时 shadow-md + border-strong）
扁平卡：.card .card-flat（无阴影）
统计卡：.stat-card > .stat-card-value + .stat-card-label + .stat-card-trend
```

### 3.4 标签/Badge（CSS class 体系）

```
.badge：圆角 4px / 字号 11px / 字重 500
色系：.badge-success / .badge-warning / .badge-danger / .badge-info / .badge-neutral / .badge-brand
.tag：圆角 6px / 字号 11px / display inline-flex + gap
```

---

## 四、响应式适配规则

| 设备 | 顶部导航 | 侧边栏 | 卡片网格 | 表单 |
|------|------|------|------|------|
| Mobile | 汉堡菜单 | 抽屉式 | 1 列 | 纵向堆叠 |
| Tablet | 标签行 | 图标收缩 | 2 列 | 2 列 |
| Desktop | 完整导航 | 240px 固定 | 3-4 列 | 2-4 列 |
| Wide | 完整导航 | 240px 固定 | 4-5 列 | 2-6 列 |

---

## 五、暗黑模式

- **机制**：CSS 变量全局切换，`<html class="dark">`
- **开关**：右上角主题按钮，localStorage 持久化
- **过渡**：`transition-colors duration-200`
- **覆盖**：全部页面（not partial）

---

## 六、动效规范

| 场景 | CSS 工具类 | 时长 |
|------|------|:--:|
| 淡入 | `.anim-fade-in` | 300ms |
| 上浮淡入 | `.anim-fade-up` | 300ms |
| 缩放入场 | `.anim-scale` | 300ms |
| 左侧滑入 | `.anim-slide-left` | 300ms |
| 右侧滑入 | `.anim-slide-right` | 300ms |
| 交错延迟 | `.delay-100` ~ `.delay-500`（每级 +100ms） | — |
| 页面切换 | `.page-enter-active` / `.page-leave-active` | 200ms / 120ms |
| 渐变呼吸 | `@keyframes breathe` | 循环 |
| 光晕脉冲 | `@keyframes glow-pulse` | 循环 |
| 渐变流动 | `@keyframes gradient-shift` | 循环 |
| 卡片上浮 | `@keyframes float-up` | 入场 |

---

## 七、字体层级

| Class | 大小 | 行高 | 字重 | 用途 |
|------|------|------|------|------|
| `.text-display` | 48px | 1.25 | 700 | Hero 大标题 |
| `.text-h1` | 36px | 1.25 | 700 | 页面主标题 |
| `.text-h2` | 24px | 1.25 | 600 | 区块标题 |
| `.text-h3` | 18px | 1.5 | 600 | 卡片标题 |
| `.text-h4` | 16px | 1.5 | 500 | 小标题 |
| `.text-body` | 14px | 1.5 | 400 | 正文 |
| `.text-body-sm` | 13px | 1.5 | 400 | 辅助/表格 |
| `.text-caption` | 11px | 1.5 | 400 | 标签/角标 |

字体栈：`'Inter', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', system-ui`

---

## 八、图标规范

- **首选库**：Heroicons v2（24px outline）
- **备用**：Lucide Icons
- **尺寸**：16/20/24/32px
- **颜色**：继承当前文字色或使用 `text-gray-400`

---

## 九、CSS 加载顺序与级联规则（架构说明）

### 9.1 加载链

| 顺序 | 文件 | 加载方式 |
|:--:|------|------|
| 1 | `unified-design-system.css` | `nuxt.config.ts` CSS 数组 |
| 2 | `design-tokens.css` | `nuxt.config.ts` CSS 数组 |
| 3 | `animations.css` | `nuxt.config.ts` CSS 数组 |
| 4 | `responsive.css` | `nuxt.config.ts` CSS 数组 |
| 5 | `theme.css` | `app.vue` import（最后加载，**最高优先级**） |

> **级联结论**：同名的 CSS 自定义属性以 `theme.css` 为准。组件 class 引用 `var(--xxx)` 时实际取值由 `theme.css` 决定。

### 9.2 已知差异（theme.css 覆盖 unified-design-system）

| 属性 | unified-design-system.css | theme.css（实际生效） | 影响 |
|------|------|------|------|
| `--input-radius` | `8px`（via `--radius-md`） | `10px` | 输入框圆角 |
| `--btn-radius` | `8px`（via `--radius-md`） | `10px` | 按钮圆角 |
| `--shadow-sm` | 双值阴影 | 单值（`0 1px 2px`） | 卡片/轻量阴影 |
| `--shadow-card` | 即 `--shadow-sm` | 独立定义（`0 1px 3px`） | 卡片阴影 |
| `--focus-ring` | `0.18` 透明度 | `0.18` 透明度 | 一致 ✓ |

> **设计意图**：规范文档标注 8px 圆角，但 `theme.css` 实际渲染 10px。此为遗留差异，待统一决策。

---

## 十、已知问题清单（G3 审计 2026-05-14 · 持续更新）

### 10.1 已修复（按时间倒序）

**第六轮修复（旧品牌色清剿 + main.css 动画 Bug）：**

| 问题 | 文件 | 处理 |
|------|------|------|
| error.vue 首页 btn-home hover 阴影 `rgba(124,58,237,0.3)` | `error.vue:54` | → `rgba(var(--brand-rgb), 0.3)` |
| pages/error.vue 同款旧色阴影 | `pages/error.vue:83` | → `rgba(var(--brand-rgb), 0.3)` |
| default.vue skip-link 回退色 `#3b82f6`（非品牌色） | `layouts/default.vue:250` | `#3b82f6` → `#5b5fe3` |
| default.vue 3 处搜索/按钮阴影旧色 | `layouts/default.vue:310,390,448` | `rgba(124,58,237,x)` → `rgba(var(--brand-rgb), x)` |
| **main.css toast 动画完全失效** | `main.css:89` | `animation: var(--slide-up)`（不存在变量）→ `animation: anim-slide-up 0.3s ease-out` |
| EmptyState 悬停阴影旧色 | `components/shared/EmptyState.vue:122` | → `rgba(var(--brand-rgb), 0.35)` |
| CommandPalette 2 处 hover 背景旧色 | `components/search/CommandPalette.vue:261,286` | → `rgba(var(--brand-rgb), ...)` |
| ResultPanel 结果面板双色旧色 | `components/admin/test-workbench/ResultPanel.vue:139` | background + border 均 → `rgba(var(--brand-rgb), ...)` |
| HistoryPanel 列表 hover 旧色 | `components/admin/test-workbench/HistoryPanel.vue:117` | → `rgba(var(--brand-rgb), 0.03)` |
| **新增发现**：3 个 layout（agent/gateway/ops）`accent-color` 使用 `#3b82f6`/`#10b981`/`#f59e0b`（非品牌色） | `layouts/agent.vue` / `gateway.vue` / `ops.vue` | 待架构确认是否为各模块独立主题色 |
| **新增发现**：enterprise.vue 暗黑侧栏全硬编码色（`#0f121e`/`#e8eaf0`/`#a5a9f0`） | `layouts/enterprise.vue:146,186` | 无 token 回退，暗黑专属设计意图 |
| **新增发现**：workspace.vue 大量硬编码色值（但有 `var(--xx, #fallback)` 模式，可接受） | `layouts/workspace.vue` | P3 — 建议最终迁移到 token |

**第五轮修复（可及性 + 品牌色可维护性）：**

| 问题 | 文件 | 处理 |
|------|------|------|
| `.btn` 仅 `:focus-visible` 无 `:focus` 回退 | `unified-design-system.css:347` | 添加 `:focus` 层 + `:focus:not(:focus-visible)` 抑制双环 |
| `prefers-reduced-motion` 未覆盖组件过渡 | `unified-design-system.css` + `main.css` | 追加全局 `@media (prefers-reduced-motion: reduce)` 阻断所有动画 |
| 缺失 `.sr-only` 屏幕阅读器工具类 | `main.css` | 新增标准 `.sr-only` 类（clip+1px 尺寸） |
| 14 个品牌色 alpha token 硬编码 rgba | `design-tokens.css` + `theme.css` | 引入 `--brand-rgb` 基础 token（亮 `91,95,227` / 暗 `107,120,255`），所有 14 个 `--brand-alpha-*`、6 个 `--shadow-*`/`--focus-*`、4 个 `--ws-*`、2 个 pattern class 改用 `rgba(var(--brand-rgb),...)` |
| `--border-brand` 死 token（零引用） | `design-tokens.css` + `unified-design-system.css` | 从 design-tokens 移除，unified 保留定义（向后兼容） |
| `gradient-mesh` 含旧品牌色 `#7C3AED` 残留 | `theme.css:416` | `rgba(124,58,237,0.03)` → `rgba(var(--brand-rgb),0.03)` |
| 纠正 `--color-brand-*` 死代码误判 | （无损回退） | 经 67 处引用验证，`--color-brand-*` 在 12 个 Vue/CSS 文件中活跃使用，系误判 |

**第四轮修复：**

本轮为纯审计发现，未修改文件（所有新发现均为跨组/G4 职责范围）。

**第三轮修复：**
| 问题 | 文件 | 处理 |
|------|------|------|
| 暗黑模式 brand-alpha-* 8 个 token alpha 值全部偏低 | `theme.css:297-304` | 08/10/12/15/20/25/30/35 分别从 0.06/0.08/0.10/0.10/0.12/0.15/0.18/0.15 修正为名义值 |
| design-tokens 暗黑模式残留 `#5b5fe3` 亮色品牌 | `design-tokens.css:46-49` | `#5b5fe3` → `#6b78ff` / `#8b95ff`（对齐暗黑品牌色） |
| 暗黑模式缺失 `--input-focus-border` / `--focus-ring` | `theme.css:254-255` | 补全暗黑模式定义，防止亮色残留 |

**第二轮修复：**
| 问题 | 文件 | 处理 |
|------|------|------|
| 页面过渡动画 3 处重复定义 | 3 个 CSS 文件 | 统一到 `animations.css`，删除 unified/theme 死代码 |
| keyframes 命名跨文件不统一 | `animations.css` / `unified-design-system.css` | 统一为 kebab-case，删 7 个冗余 keyframe |

**第一轮修复：**
| 问题 | 文件 | 处理 |
|------|------|------|
| 品牌色文档 vs CSS 不一致 | CLAUDE.md + 设计规范 | `#7C3AED` → `#5b5fe3` |
| skeleton-shimmer 引用外部UI库变量 | `animations.css:67` | `--el-fill-*` → `--skeleton-*` |
| 暗黑模式缺失 brand-alpha 色阶 | `theme.css:297-299` | 补全 08/12/20/25/30/35 共 6 个 token |
| 设计规范版本号陈旧 | `UI_Movio_AI_设计规范.md` | v1.0→v1.1 |

### 10.2 待处理（跨组）
| 优先级 | 问题 | 细节 | 建议处理组 |
|:--:|------|------|:--:|
| P0 | 14 个页面 + 3 个组件硬编码 `#7C3AED`（旧品牌色） | §10.7 完整清单：6 pages + 6 之前已报告 + 2 error.vue + 3 components | G4 |
| P0 | 6 个页面品牌色 fallback 错误（`#409eff`/`#3B82F6` 非项目品牌） | §10.7 完整清单：ai-assistant/data|review、workspace-diy、ai-models、ecommerce/index | G4 |
| P0 | 3 个 enterprise 页面使用独立品牌色 `#667eea`（非 `#5b5fe3`） | enterprise/dashboard.vue、users.vue、whitelabel.vue 各自定义 `--ed-brand: #667eea` | G4+PM |
| P0 | i18n 键结构断裂 | 英 6291 键 vs 中 6109 键 — 英独有 211 键 / 中独有 29 键，跨语言切换会导致空白文本 | G4 + PM |
| P1 | `.modal` 分散定义在 31 个 Vue 文件中 | 部分用设计系统 token、部分硬编码（`12px`/`16px`/`440px`等），应提取到 CSS 系统 | G4 |
| P1 | `prefers-color-scheme` 自动暗黑模式缺失 | 暗黑仅支持 class 切换（`.dark`），不响应 OS 级偏好设置。需 JS/HTML meta 配合 | G3+架构 |
| P1 | 多个管理页面功能色硬编码（success/danger/warning） | enterprises.vue:10+处、ai-models.vue:4处 dot、ab-experiments:4处 badge、dashboard:3处 rank | G4 |
| P2 | 阴影值 theme.css vs unified 不一致 | 见下方 §10.3 | G3+架构 |
| P2 | `--input-focus-border` 亮色模式两套不同色 | theme.css: `#a5a2f2` vs unified: `var(--color-brand-400)`=`#8b87ed` | G3 |
| P3 | `--radius-2xl` / `--space-10` / `--space-12` / `--space-20` / `--bp-xs` / `--bp-lg` / `--bp-xl` 定义但从未引用 | 3 个 CSS 文件中的死 token | G3 |

### 10.3 阴影值差异详情

theme.css 后加载，其阴影 token 覆盖 unified-design-system.css 中同名定义。差异如下：

| Token | unified (被覆盖) | theme.css (实际生效) |
|-------|-----------------|---------------------|
| `--shadow-sm` | 双层：`0 1px 3px + 0 1px 2px` | 单层：`0 1px 2px` |
| `--shadow-md` | `0 4px 12px + 0 1px 4px` | `0 6px 16px` |
| `--shadow-lg` | `0 8px 24px + 0 2px 8px` | `0 12px 32px` |
| `--shadow-xl` | `0 16px 48px + 0 4px 16px` | `0 20px 48px` |
| `--shadow-brand` | focus-ring: `0 0 0 4px` | glow: `0 4px 16px` |

### 10.4 暗黑模式品牌色双轨制（已澄清）

> 第五轮纠正：`--color-brand-*` 体系并非死代码——67 处引用跨 12 文件，`AdminShell.vue`/`dashboard`/`ai-assistant` 等皆有使用。

| 色值 | 出现位置 | 用途 |
|------|------|------|
| `#8b95ff` | theme.css `--brand`/`--text-link`、design-tokens 暗黑 `--text-link` | 暗黑主品牌色 |
| `#6b78ff` | theme.css/unified 暗黑 `--brand-gradient`、`--brand-alpha-*`（via `--brand-rgb: 107,120,255`）| 渐变 + alpha 变体基色 |

> **现状**：暗黑模式主色 `#8b95ff` vs alpha 基色 `rgb(107,120,255)`（≈`#6b78ff`）存在约 5% 色差。此为 Legacy 设计意图（暗黑下需要偏冷偏亮补偿），非 Bug。待架构确认是否统一。

unified 为更精细多层阴影（符合现代设计系统惯例），theme.css 为较简单单层大扩散阴影。需统一到一套。暗黑模式同理存在差异。

### 10.5 `--brand-rgb` 基础 Token 架构（v1.4 新增）

为解决品牌色 alpha 变体硬编码问题，引入基色 RGB 分量 token：

```
:root { --brand-rgb: 91, 95, 227; }            /* #5b5fe3 */
.dark  { --brand-rgb: 107, 120, 255; }         /* ≈#6b78ff */
```

**使用规范**：所有需要 alpha 透明的品牌色属性统一写为 `rgba(var(--brand-rgb), <alpha>)`，不再硬编码 rgba 数值。

**已覆盖**：14 个 `--brand-alpha-*`、`--focus-ring`、`--shadow-brand`/`--shadow-brand-glow`/`--brand-glow`/`--shadow-glow`、`--brand-border`（亮+暗）、`--ws-*` 4 个、pattern class 2 个。

**例外**：`@keyframes glow-pulse` 中 2 处 box-shadow 保留硬编码——CSS 自定义属性在 keyframe 中需依赖插值行为，`var()` 在部分浏览器会阻断动画平滑过渡。

### 10.6 可及性缺口（v1.4 新增）

| 项目 | 状态 | 说明 |
|------|:--:|------|
| 按钮焦点环 | ✅ 已修复 | `.btn:focus` 回退 + `:focus:not(:focus-visible)` 防双环 |
| reduced-motion | ✅ 已修复 | unified + main 追加 `prefers-reduced-motion: reduce` |
| .sr-only 工具类 | ✅ 已修复 | 标准 clip+1px 屏幕阅读器专用类 |
| prefers-color-scheme | ❌ 待处理 | 暗黑仅 class 切换，不响应 OS 偏好。需 G3+架构确认方案（meta theme-color + JS matchMedia + CSS fallback） |
| 对比度验证 | ⚠️ 未审计 | 品牌色 `#5b5fe3` 在白色背景对比度约 4.3:1（WCAG AA 1 分界线），建议自动工具批量验证 |

### 10.7 第七轮审计：pages/public/plugins 全面色值扫描（v1.6 新增）

**覆盖范围**：30+ pages Vue 文件、7 个 public/ 静态资源、8 个 plugins、1 个 middleware

#### ✅ 通过审查（无问题）

| 资产 | 状态 |
|------|:--:|
| `public/manifest.json` — `theme_color: #5b5fe3` | ✅ |
| `public/favicon.svg` — 渐变 `#5b5fe3`→`#a5a9f0` | ✅ |
| `public/offline.html` — 全量引用 `#5b5fe3`，含 PWA 离线页品牌一致性 | ✅ |
| `plugins/` 8 个文件 — 零硬编码色值 | ✅ |
| `middleware/auth.global.ts` — 纯逻辑，无样式引用 | ✅ |

#### ❌ P0：旧品牌色 `#7C3AED` 硬编码（本页新增 6 个文件）

| 文件:行 | 代码片段 |
|------|------|
| `pages/member/index.vue:133` | `background: linear-gradient(135deg, #4F46E5, #7C3AED)` |
| `pages/my/credits.vue:91` | `color: var(--brand, #7C3AED)` |
| `pages/my/collections.vue:97` | `background: var(--brand-gradient, linear-gradient(135deg, #7C3AED, #A78BFA))` |
| `pages/my/collections.vue:113` | `.card-cover { background: … #7C3AED, #A78BFA }` |
| `pages/work/marketplace.vue:113` | `const hues = ['#7C3AED', '#3B82F6', '#EC4899', …]` |
| `pages/admin/brand-settings.vue:35` | `primary_color: '#7C3AED'` |

#### ❌ P0：品牌色 fallback 错误（6 个文件用 `#409eff` / `#3B82F6`）

| 文件 | 错误 fallback | 应改为 |
|------|------|------|
| `pages/ai-assistant/review.vue:69` | `var(--color-brand-500, #409eff)` | `#5b5fe3` |
| `pages/ai-assistant/data.vue:66,73` | `var(--color-brand-500, #409eff)` (2x) | `#5b5fe3` |
| `pages/admin/workspace-diy.vue:307,312,351,382` | `var(--brand, #409eff)` (4x) | `#5b5fe3` |
| `pages/admin/ai-models.vue:114,149,152,225` | `var(--cfg-primary, #3B82F6)` (4x) | `#5b5fe3` |
| `pages/ecommerce/index.vue:467,487` | `#1a73e8` (Google Blue) | `var(--brand)` |
| `pages/enterprise/dashboard.vue:117` | `--ed-brand: #667eea` | `#5b5fe3` |
| `pages/enterprise/users.vue:169` | `--ed-brand: #667eea` | `#5b5fe3` |
| `pages/enterprise/whitelabel.vue:45` | `primaryColor: '#667eea'` | `#5b5fe3` |

> **根因**：`#409eff` 为 Element UI 默认主题色，`#3B82F6` 为 Tailwind blue-500，`#667eea` 为早期原型色。说明部分页面从 Element UI / Tailwind 模板迁移时 fallback 值未更新。

#### ⚠️ P1：功能色硬编码（管理后台集中）

- `pages/admin/enterprises.vue` — 10+ 处 stat-card 边框 / badge 文字色硬编码（`#f59e0b`/`#3b82f6`/`#10b981`/`#ef4444`）
- `pages/admin/ai-models.vue` — 4 处 `.dot` 状态色硬编码
- `pages/admin/ab-experiments.vue` — 4 处 `.badge-*` 硬编码
- `pages/dashboard/index.vue` — 3 处 `.top-rank` 硬编码（`#f59e0b`/`#8b90a5`/`#a0724a`）
- `pages/work/marketplace.vue:177` — `.badge-hot { background: #F59E0B }`

#### 累计全景

| 优先级 | P0 | P1 | P2 | P3 |
|:--:|:--:|:--:|:--:|:--:|
| 本轮前 | 8 | 4 | 3 | 7 |
| 本轮新增 | 14（页面）+ 8（fallback错误） | 15+（功能色硬编码） | 0 | 0 |
| **累计** | **30** | **20** | **5** | **9** |

#### 🟡 P1：SVG 架构图独立色系（第八轮新发现）

`docs/02_技术架构/架构图_Movio_AI_整体架构.svg` 全图使用 **Tailwind Indigo 色系**：
- 标题/箭头：`#3730A3` (Indigo-800)
- 连接线：`#818CF8` (Indigo-400)
- 背景层：`#EEF2FF` (Indigo-50)

与品牌色 `#5b5fe3` 形成**第三套独立色系**（差异 ΔE ≈ 12），视觉割裂。

#### 🟡 P2：KB_INDEX 断裂链接（第八轮新发现）

`docs/kb/KB_INDEX.md` 2 个链接指向不存在路径：
- L35 `../存档文件/Movio_AI_完善方案.md` — `存档文件/` 目录不存在
- L37 `../CLAUDE.md` — 项目根目录不在 docs/ 的 `../` 层级

#### 🟢 P3：workspace 布局字体硬编码（第八轮新发现）

`layouts/workspace.vue:139` 硬编码 `'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif`，应改为 `var(--font-sans)` 统一。

### 10.8 第八轮扫描全覆盖（2026-05-14）

| 扫描区 | 文件数 | 结果 |
|------|:--:|------|
| server/ 模板/CSS | 2 CSS (coverage) | istanbul auto-gen → skip |
| stores/ | 4 TS | 零硬编码色值 |
| public/ | 3 静态文件 | 全量正确 `#5b5fe3` |
| docs/kb + archive | 9 MD | KB_INDEX 2 断裂链接 + 其余 OK |
| SVG 架构图 | 1 | 第三套独立色系 |
| 字体一致性 | 40 文件 | workspace.vue 1 处硬编码 |
| .scss/.less 源文件 | 0 | 项目无预处理器源文件 |

### 10.9 八轮累计全景

| 优先级 | P0 | P1 | P2 | P3 | 合计 |
|:--:|:--:|:--:|:--:|:--:|:--:|
| R1-R7 累计 | 30 | 19 | 3 | 7 | 59 |
| R8 新增 | 0 | 1 | 2 | 1 | 4 |
| **总计** | **30** | **20** | **5** | **8** | **63** |

**63 项问题，G3 已自行修复 16 项，47 项待跨组处理。**
