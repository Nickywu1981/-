# Movio AI — UI 设计规范文档

> **编写组**：G3 UI 设计组（UI-Designer 🔴主 / Doc-Writer 🟡辅）
> **审核组**：G1 架构规划组（Architect）
> **版本**：v1.19 | **日期**：2026-05-15

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

### 10.10 第九轮 — 组件深层审计 + 全局配置 (2026-05-15)

#### 扫描范围

`components/` 14 个子目录 33 个硬编码文件、`composables/`（空目录）、`utils/format.ts`、`nuxt.config.ts`、`app.vue` CSS 加载链

#### 🔴 P0：`--cfg-*` 死 token 前缀（新发现类别）

4 个组件引用了 **30+ 处 `--cfg-*` CSS 变量**，但该前缀在项目的 5 个 CSS 文件中**从未定义**：

| 组件 | 引用数 | 典型 fallback（Tailwind） |
|------|:--:|------|
| `components/common/AppMediaUpload.vue` | 15 | `#4F46E5`/`#10B981`/`#EF4444`/`#374151`/`#9ca3af`/`#e5e7eb`/`#d1d5db`/`#f9fafb` |
| `components/common/AppTaskProgress.vue` | 9 | 同上 + `#F59E0B`/`#eef2ff` |
| `components/shared/SmartRecognitionPanel.vue` | 4 | `#fafbfc`/`#1e1f22` |
| `components/PromptEnhancer.vue` | 6 | Material Design 蓝 `#90caf9`/`#1565c0`/`#e3f2fd` |

> **根因**：这 4 个组件从另一套 `--cfg-*` token 体系的项目直接复制而来，token 定义未同步迁移。所有 `var(--cfg-xxx, #fallback)` 始终穿透到硬编码 fallback，CSS 变量层完全失效。

#### 🔴 P0：PromptEnhancer.vue — Material Design 独立色系

`PromptEnhancer.vue:180-184` 亮色模式的 `--brand` / `--brand-light` / `--brand-lighter` fallback 全部引用 **Material Design Blue 色系**：
- `#90caf9` (Blue 200) / `#e3f2fd` (Blue 50) / `#bbdefb` (Blue 100) / `#1565c0` (Blue 800) / `#42a5f5` (Blue 400)

暗黑模式 (`:185-186`) 正确使用 `rgba(91,95,227,...)` = `#5b5fe3`。亮/暗分裂式正确色 vs 错误色。

#### 🔴 P0：ThreeViewer.vue — **第四套独立品牌色**

`components/ThreeViewer.vue` 3D 场景全部使用 `#6c5ce7`：
- L335 `.ctrl-btn.active { color: #6c5ce7; border-color: #6c5ce7; background: rgba(108,92,231,0.15); }`
- L352 `background: #6c5ce7;`
- L363 `border-top-color: #6c5ce7;`
- L83 `new THREE.Color('#1a1a2e')` — 独立深色背景

与正 确品牌色 `#5b5fe3` 差异 ΔE≈8，与旧 `#7C3AED` 差异 ΔE≈14。形成项目内**第四套独立品牌色**。

#### 🔴 P0：ConfirmDialog.vue — Tailwind blue-500 品牌 fallback

`ConfirmDialog.vue:107` `.btn-primary { background: var(--brand, #3b82f6); }`
- `#3b82f6` = Tailwind blue-500，与品牌色 `#5b5fe3` 色调完全不同

#### 🔴 P0：StatsCard.vue — Element UI blue accent fallback

`StatsCard.vue:7` `borderTopColor: color || 'var(--accent, #409eff)'`
- `#409eff` = Element UI 默认主题色，`--accent` token 全局未定义 → 始终穿透到 Element 蓝

#### 🔴 P0：GlobalAIChat.vue + QuickCommands.vue — Indigo-500 fallback

- `GlobalAIChat.vue:59-60` `var(--brand-alpha, rgba(99,102,241,0.06))` → `rgb(99,102,241)` = Tailwind Indigo-500
- `QuickCommands.vue:53` 同上 `rgba(99,102,241,0.06)` fallback

#### 🟡 P1：组件层重度硬编码（6 组件 / 25+ 处）

| 组件 | 硬编码数 | 典型值 |
|------|:--:|------|
| `SlidePanel.vue` | 6 | `#5b5fe3`×2, `#4a4ed6`, `#f0f0ef`, `#1a1a1a`, `#2a2a2a` |
| `PageHeader.vue` | 5 | `#303133`/`#6b7280`/`#b0b5bd`/`#4d5054`（Element UI 灰度） |
| `ComingSoonPlaceholder.vue` | 8 | `#171717`/`#6b6b70`/`#9d9da3`/`#f3f4f6`/`#7d7d83`/`#2a2a2a` |
| `PromptPreview.vue` | 5 | `#16a34a`/`#dc2626`（独立绿/红色） |
| `QuickSaveButton.vue` | 3 | `#ec4899`/`#fdf2f8`（独立粉色） |
| `DiySectionPreview.vue` | 1 | `#ff6600` |

#### 🟡 P1：暗黑模式 3 文件使用独立深色值

- `SlidePanel.vue:276` `background: #1a1a1a`（vs token `--bg-card: #141724`）
- `ComingSoonPlaceholder.vue:63` `background: #2a2a2a`（vs token `--bg-tag: #1e2030`）
- `SmartRecognitionPanel.vue:105` `background: #1e1f22` — 第三套暗色

#### 🟢 P2：Nuxt CSS 数组与 app.vue 双通道加载

`nuxt.config.ts` CSS 数组包含 4 个文件，`app.vue` `import` 额外加载 `main.css` + `theme.css`。双通道加载无冲突但增加认知负担——维护者可能误以为 nuxt.config 数组是完整清单。

#### 🟢 P3：PromptEnhancer.vue @keyframes pe-spin 重复

`@keyframes pe-spin { to { transform: rotate(360deg); } }` 与 `animations.css` 的 `anim-spin` 完全一致，应复用。

#### ✅ 通过项（第九轮）

| 资产 | 状态 |
|------|:--:|
| `nuxt.config.ts` theme-color / PWA theme_color | `#5b5fe3` 正确 |
| `nuxt.config.ts` PWA 配置完整度 | 优秀（缓存策略齐全） |
| `app.vue` 全局错误边界 | 正确使用 `var(--brand)` + `var(--text-muted)` |
| `utils/format.ts` | 零硬编码色值 |
| `components/landing/LandingFooter.vue` | 仅 `rgba(0,0,0,...)` overlay → 低风险 |
| `components/diy/VersionHistoryModal.vue` | 正确使用 `var(--bg-card)` |
| `components/search/CommandPalette.vue` | 正确使用 `var(--brand-rgb)` |
| `components/admin/test-workbench/` | 仅功能色硬编码 + `rgba(var(--brand-rgb)...)` 正确 |

#### 第九轮增量统计

| 优先级 | 新增 | 说明 |
|:--:|:--:|------|
| P0 | 17 | `--cfg-*`死前缀(14) + 独立品牌色(3类) |
| P1 | 7 | 组件层重度硬编码(6) + 暗黑独立色(1) |
| P2 | 1 | Nuxt 双通道加载 |
| P3 | 1 | pe-spin 重复 keyframe |
| **合计** | **26** | |

### 10.11 九轮累计全景

| 优先级 | P0 | P1 | P2 | P3 | 合计 |
|:--:|:--:|:--:|:--:|:--:|:--:|
| R1-R8 累计 | 30 | 20 | 5 | 8 | 63 |
| R9 新增 | 17 | 7 | 1 | 1 | 26 |
| **总计** | **47** | **27** | **6** | **9** | **89** |

**89 项问题，G3 已自行修复 16 项，73 项待跨组处理。**

### 10.12 第十轮 — 暗黑模式组件级覆盖率 + 表单一致性 + 死代码审计 (2026-05-15)

**审计范围**：全 5 个 CSS 文件暗黑模式 token 完整度、11 页/5 组件内联暗黑覆盖一致性、unified 组件类使用率、表单元素跨组件一致性

---

**① 暗黑模式 Badge/Tag 语义色完全缺失（P0 — 新增 1 项）**

`--color-success-50/700`、`--color-warning-50/700`、`--color-danger-50/700`、`--color-info-50/700` 在 `:root` 块定义为亮色值（如 `#ecfdf5` / `#059669`），但在 unified 和 theme.css 两个 `[data-theme="dark"]` 块中**均未覆盖**。

后果：
- `.badge-success` 等类在暗黑模式下显示亮绿底色 + 深绿文字 → 视觉断裂
- `stat-card-trend` 使用 `--color-success-500` / `--color-danger-500`，暗黑模式下色值不变（`#10b981`/`#ef4444`），对比度勉强但缺乏暗黑适配

修复方向：在 theme.css 的 `[data-theme="dark"]` 块中追加语义色暗黑变体。

**② 暗黑模式覆盖碎片化：8 处页面/组件自写 `[data-theme="dark"]`，值不一致（P0 — 新增 1 项）**

| 文件 | 自写暗黑背景色 | 正确值 `var(--bg-surface)` |
|------|:--:|:--:|
| `creation.vue` | `#1a1a1a` | `#141724` |
| `SlidePanel.vue` | `#1a1a1a` / `#222` | `#141724` |
| `SmartRecognitionPanel.vue` | `#1e1f22` | `#141724` |
| `review.vue` | `var(--bg-card, #1a1a1a)` | `var(--bg-card, #141724)` |
| `data.vue` | `var(--bg-card, #1a1a1a)` | `var(--bg-card, #141724)` |
| `ComingSoonPlaceholder.vue` | `#2a2a2a` / `#7d7d83` | `#1e2235` / `#5d6380` |
| `PromptEnhancer.vue` | `var(--bg-card, #1e1e1e)` | `var(--bg-card, #141724)` |
| `index.vue:748` (landing) | 独立 `[data-theme="dark"]` | 待复查 |

同一暗黑模式下，页面间表面色不一致（`#1a1a1a` vs `#141724` vs `#1e1f22`），产生视觉割裂。

**③ 暗黑模式双块 16 token 缺口（P1 — 新增 1 项）**

| unified `[data-theme="dark"]` 有但 theme.css 缺 | 风险 |
|------|------|
| `--bg-surface`, `--bg-surface-hover`, `--bg-surface-raised` | card/modal/stat-card 关键底色 |
| `--bg-tooltip`, `--text-placeholder`, `--text-link-hover` | 工具提示/占位符/链接悬停 |
| `--border-default`, `--border-strong`, `--border-brand` | 输入框/卡片/品牌边框 |
| `--gradient-brand-subtle`, `--gradient-hero` | Subtle 渐变/Hero 渐变 |
| `--shadow-xs`, `--shadow-brand-glow` | 细节阴影/品牌辉光 |
| `--sidebar-bg-hover`, `--sidebar-bg-active`, `--sidebar-border` | 侧边栏交互态 |
| `--header-bg`, `--header-border` | 顶栏 |
| `--input-bg`, `--input-focus-shadow` | 输入框背景/焦点辉光 |
| `--card-shadow-hover` | 卡片悬停阴影 |

> 当前未崩的原因是 unified 先加载、theme.css 后加载但不覆盖这些变量名。一旦加载顺序调整或合并双块，16 个 token 全部回退到亮色值。

**④ 双背景 Token 命名冲突（P2 — 新增 1 项）**

- unified 使用 `--bg-app`（暗黑 = `#0a0c14`）
- theme.css 使用 `--bg-page`（暗黑 = `#0a0c14`）
- 两者值相同但 token 名不同，各组件各自引用其中之一

**⑤ CSS 死代码：24 个工具类零引用（P3 — 新增 1 项）**

| 文件 | 死类 | 行号 |
|------|------|:--:|
| unified | `.text-display`, `.text-body-lg`, `.text-body`, `.text-body-sm`, `.text-caption` | 326-334 |
| unified | `.card-flat` | 418 |
| unified | `.badge-neutral`, `.badge-brand` | 432-433 |
| unified | `.tag` | 435 |
| unified | `.select` | 393 |
| unified | `.label`, `.hint`, `.error-text` | 405-407 |
| unified | `.empty-state-icon`, `.empty-state-title`, `.empty-state-desc` | 498-500 |
| unified | `.flex`, `.flex-col`, `.items-center`, `.justify-between` | 511-514 |
| theme.css | `.dot-pattern`, `.dot-pattern-subtle`, `.gradient-mesh` | 403/408/413 |

> `.flex` / `.flex-col` / `.items-center` / `.justify-between` 被 Tailwind 同名字段完全覆盖（项目启用 Tailwind），CSS 定义属徒增文件体积。

**⑥ 表单类碎片化：7 种互不兼容的 select 类名（P2 — 新增 1 项）**

统一 `.select` 类 0 引用。各页面自创：
`tw-select` / `tw-select-sm` (Tailwind) / `pay-select` / `filter-select` / `pipeline-select` / `bsi-select` / `class="input" on <select>`

其中 `ab-experiments.vue` 在 `<select>` 上使用 `class="input"` — 缺少 `appearance:none` + 下拉箭头 SVG → 浏览器原生渲染，与其他表单视觉不一致。

---

| 优先级 | 本轮新增 | 说明 |
|:--:|:--:|------|
| P0 | 2 | Badge 暗黑语义色缺失 + 8 处暗黑覆盖碎片化 |
| P1 | 1 | 16 token 缺口 (unified dark vs theme dark) |
| P2 | 2 | `--bg-app`/`--bg-page` 双命名 + 7 种 select 碎片化 |
| P3 | 1 | 24 个零引用 CSS 类 |

### 10.13 十轮累计全景

| 优先级 | 旧累计 | R10 新增 | 总计 |
|:--:|:--:|:--:|:--:|
| P0 | 47 | 2 | **49** |
| P1 | 27 | 1 | **28** |
| P2 | 6 | 2 | **8** |
| P3 | 9 | 1 | **10** |
| **合计** | **89** | **6** | **95** |

**95 项问题，G3 已自行修复 16 项，79 项待跨组处理。**

---

## 十一、第十一轮审计 — Nuxt 构建层 + Layout CSS + 打印样式

**审计日期**：2026-05-15  
**范围**：`nuxt.config.ts`、`app.vue` 加载链、4 个 layouts CSS 定义、Element Plus 按需加载、打印样式

### 10.15 Layout CSS 完全缺失（P0 新增 3 项）
`user-workspace.vue`、`platform-admin.vue`、`business-ops.vue` 三个核心布局均**无 `<style>` 块**，使用的全部 CSS 类名在项目 6 个 CSS 文件中**零定义**：

| 类名 | 使用位置 | CSS 定义 |
|------|------|:--:|
| `.user-workspace-layout` | user-workspace:2 | ❌ |
| `.platform-admin-layout` | platform-admin:2 | ❌ |
| `.business-ops-layout` | business-ops:2 | ❌ |
| `.sidebar` | 3 个 layout | ❌ |
| `.nav-item` | 3 个 layout | ❌ |
| `.nav-group` | 3 个 layout | ❌ |
| `.nav-label` | 3 个 layout | ❌ |
| `.topbar` | 3 个 layout | ❌ |
| `.role-btn` / `.role-switcher` | user-workspace:125 | ❌ |

`--sidebar-*` token 已在 unified 中被定义（亮+暗），但无任何 CSS 规则消费它们。布局完全依赖浏览器默认渲染。

### 10.16 platform-admin 重复路由（P0）
`platform-admin.vue:33` 和 `:39` 均指向 `/admin/settings`，分别标注"WAF/密钥"和"系统参数" — 同一 URL，第二个链接永远不生效。

### 10.17 business-ops 跨布局路由（P0）
`business-ops.vue` 侧边栏含 5 条 `/admin/*` 和 1 条 `/gateway/*` 路由，但 `nuxt.config.ts:201-203` 将 `/admin/*` 和 `/gateway/*` 映射到 `platform-admin` 布局。点击这些链接会导致**布局全局切换**而非在同一侧边栏内导航。

### 10.18 无打印样式（P1 新增 1 项）
项目零 `@media print` 定义。打印任意页面渲染完整交互式 UI（侧边栏、顶栏、按钮均可见），无任何打印优化。

### 10.19 Element Plus 全量 CSS 加载（P2 新增 1 项）
`plugins/element-plus.ts` 导入完整 `element-plus/dist/index.css`（~200KB），但项目仅使用 `ElMessage` + `ElConfigProvider` 两个组件。按需加载可节省约 80%。

### 10.20 CSS 加载顺序隐患（P2 新增 1 项）
`theme.css` 在 `app.vue` 最后加载，覆盖前 5 个文件所有同名属性。nuxt.config CSS 数组中修改 token 会被 theme.css 静默覆盖。

### 10.21 本轮累计

| 优先级 | 旧累计 | R11 新增 | 总计 |
|:--:|:--:|:--:|:--:|
| P0 | 49 | 3 | **52** |
| P1 | 28 | 1 | **29** |
| P2 | 8 | 2 | **10** |
| P3 | 10 | 0 | **10** |
| **合计** | **95** | **6** | **101** |

**101 项问题，G3 已自行修复 16 项，85 项待跨组处理。**

---

## 十二、第十二轮审计 — 改版回归 + ChatPanel + 品牌 Fallback 清零

**审计日期**：2026-05-15  
**范围**：本轮工作台改版 2 文件回归审计、ChatPanel 4 子组件、全站 `rgba(99,102,241,...)` indigo-500 fallback 扫荡

### 10.22 改版自伤问题（P0，R12 修复 6 项）

| 文件 | 问题 | 修复 |
|------|------|------|
| `user-workspace.vue` | 7 个新交互元素（`.tb-btn-*`、`.tb-btn-icon`、`.tb-user-menu`、`.tb-drop-item`、`.cs-close`）缺失 `:focus-visible` | 全部补全焦点态 |
| `user-workspace.vue` | 暗黑模式完全缺失 — 下拉菜单 `#fff` 背景、按钮硬编码灰色在暗黑不可见 | 追加 15 条 `[data-theme="dark"]` 规则 |
| `ChatPanel.vue` | `.cp-btn-icon`、`.cp-attach-btn`、`.cp-send` 无 `:focus-visible` | 全部补全 |
| `QuickCommands.vue` | `.qc-chip` 无 `:focus-visible` | 补全 |
| `GlobalAIChat.vue` | `.gac-btn` 无 `:focus-visible` | 补全 |

### 10.23 indigo-500 fallback 全量清零（P2，R12 修复 9 项）

全站 9 处 `rgba(99,102,241,...)` 替换为 `rgba(var(--brand-rgb, 91,95,227), ...)`：

| 文件 | 行 | 原文 | 改为 |
|------|:--:|------|------|
| `QuickCommands.vue` | 53 | `rgba(99,102,241,0.06)` | `rgba(var(--brand-rgb, 91,95,227), 0.06)` |
| `GlobalAIChat.vue` | 59,60 | `rgba(99,102,241,0.08/0.12)` | `rgba(var(--brand-rgb, 91,95,227), 0.08/0.12)` |
| `SkuSelector.vue` | 124 | `rgba(99,102,241,0.08)` | `rgba(var(--brand-rgb, 91,95,227), 0.08)` |
| `batch-publish.vue` | 87 | 同上 | 同上 |
| `batch-sku-video.vue` | 156 | 同上 | 同上 |
| `batch-sku-image.vue` | 167,169 | `rgba(99,102,241,0.08/0.06)` | `rgba(var(--brand-rgb, 91,95,227), 0.08/0.06)` |
| `action-migrate.vue` | 95 | `rgba(99,102,241,0.06)` | `rgba(var(--brand-rgb, 91,95,227), 0.06)` |

全站 `rgba(99,102,241` 已归零。

### 10.24 新增待处理项

| 优先级 | 问题 | 位置 |
|:--:|------|------|
| P1 | 8 处中文硬编码文本（购买会员/免费领积分/管理后台/个人中心等） | `user-workspace.vue:141-194` |
| P1 | 5 处硬编码（结果预览/提示词/参数/进度步骤） | `creation.vue:121-171` |
| P2 | ChatPanel `left: 260px` 硬编码 | `ChatPanel.vue:204` |
| P3 | 新顶栏图标按钮 `title` attribute 硬编码中文 | `user-workspace.vue:153-166` |

### 10.25 第十一轮误判纠正

R11 标记 `user-workspace.vue` 等 3 个 layout "CSS 完全缺失" — **本例即修复**。R12 改版中 `user-workspace.vue` 已补全完整的 `<style scoped>` 块（445 行），`.sidebar`/`.nav-item`/`.topbar` 等全部类名现已有定义。

### 10.26 本轮累计

| 优先级 | R11 累计 | R12 新增 | R12 修复 | 总计 |
|:--:|:--:|:--:|:--:|:--:|
| P0 | 52 | 0 | -6 | **46** |
| P1 | 29 | 2 | 0 | **31** |
| P2 | 10 | 1 | -9 | **2** |
| P3 | 10 | 1 | 0 | **11** |
| **合计** | **101** | **4** | **-15** | **90** |

**90 项问题，G3 已自行修复 31 项，59 项待跨组处理。**

---

## 十三、第十三轮审计 — 全站紫色阴影清零 + 加载态一致性 + EmptyState 修复

**审计日期**：2026-05-15  
**范围**：全站 `rgba(124,58,237,...)` 紫色阴影扫荡、16 文件加载态一致性审计、EmptyState 组件审计、3 工作页面硬编码文本验证

### 10.27 紫色阴影 `#7C3AED` 全量清零（P2，R13 修复 13 实例/11 文件）

全站 13 处 `rgba(124,58,237,...)` 替换为 `rgba(var(--brand-rgb, 91,95,227), ...)`：

| 文件 | 行 | 原文 | 改为 |
|------|:--:|------|------|
| `my-works.vue` | 183 | `rgba(124, 58, 237, .12)` | `rgba(var(--brand-rgb, 91,95,227), .12)` |
| `favorites.vue` | 119 | `rgba(124,58,237,0.08)` | `rgba(var(--brand-rgb, 91,95,227), 0.08)` |
| `collections.vue` | 116 | `rgba(124, 58, 237, .1)` | `rgba(var(--brand-rgb, 91,95,227), .1)` |
| `collections.vue` | 117 | `linear-gradient(135deg, #7C3AED, #A78BFA)` | `linear-gradient(135deg, var(--brand), color-mix(...))` |
| `compare.vue` | 319 | `rgba(124,58,237,0.3)` | `rgba(var(--brand-rgb, 91,95,227), 0.3)` |
| `help.vue` | 171 | `rgba(124,58,237,.06)` | `rgba(var(--brand-rgb, 91,95,227), .06)` |
| `account/settings.vue` | 180 | `rgba(124,58,237,0.3)` | `rgba(var(--brand-rgb, 91,95,227), 0.3)` |
| `register.vue` | 163,205,207 | `rgba(124,58,237,...)` ×3 | `rgba(var(--brand-rgb, 91,95,227), ...)` ×3 |
| `login.vue` | 163,218,220 | `rgba(124,58,237,...)` ×3 | `rgba(var(--brand-rgb, 91,95,227), ...)` ×3 |
| `admin/test-workbench.vue` | 355 | `rgba(124,58,237,...)` ×2 | `rgba(var(--brand-rgb, 91,95,227), ...)` ×2 |

仅 `client/public/design-sketch-brand-colors.html:55` 保留一处作为设计参考文档（非生产代码）。

### 10.28 EmptyState 组件修复（P2，R13 修复 1 项）

| 文件 | 问题 | 修复 |
|------|------|------|
| `EmptyState.vue:122` | `rgba(var(--brand-rgb), 0.35)` 缺少 fallback 值 | → `rgba(var(--brand-rgb, 91,95,227), 0.35)` |

组件整体质量良好：三尺寸变体（sm/md/lg）、slot 自定义 visual、i18n 默认值、双按钮（主+示例）模式。

### 10.29 加载态一致性审计（16 文件）

审计结论：

| 模式 | 文件数 | 代表文件 |
|------|:--:|------|
| 三态完整（loading+error+empty） | 5 | `dashboard/index.vue`、`help.vue`、`my-works.vue`、`account/templates.vue`、`publish.vue` |
| 双态（loading+empty，缺 error） | 6 | `distribution/index.vue`、`cut-ecosystem.vue`、`social/index.vue` 等 |
| 单态（仅 loading） | 3 | `batch-sku-image.vue`、`batch-sku-video.vue`、`action-migrate.vue` |
| Element Plus 内置 | 2 | `copywriting.vue`（el-button :loading + el-table v-loading） |

**最佳实践参考**：
- **Skeleton**：`my-works.vue`（pulse 动画 + grid 骨架卡）、`help.vue`（问答骨架）
- **Spinner**：`dashboard/index.vue`（CSS spinner + 文案）
- **Error+Retry**：`my-works.vue`、`help.vue`、`account/templates.vue`
- **Empty+CTA**：`my-works.vue`（引导去工作台）、`cut-ecosystem.vue`（引导去创作）

### 10.30 工作页面硬编码文本验证

`batch-sku-image.vue`、`batch-sku-video.vue`、`action-migrate.vue` 三个页面全部文案已通过 `t()` i18n 化，无硬编码中文或英文文本。✅

### 10.31 新增待处理项

| 优先级 | 问题 | 位置 |
|:--:|------|------|
| P1 | 11 处中文硬编码（购买会员/免费领积分/管理后台/个人中心等） | `user-workspace.vue:142-194` |
| P1 | 4 处硬编码（结果预览/提示词/参数） | `creation.vue:121-143` |
| P3 | `--text-tertiary` 旧 token 命名（应为 `--text-muted`） | `account/templates.vue:73,82,94` 等多文件 |
| P3 | 硬编码颜色 `#e8f4fd`/`#fce8e6`/`#d93025` 用于 type-tag | `cut-ecosystem.vue:310-311` |

### 10.32 本轮累计

| 优先级 | R12 累计 | R13 新增 | R13 修复 | 总计 |
|:--:|:--:|:--:|:--:|:--:|
| P0 | 46 | 0 | 0 | **46** |
| P1 | 31 | 0 | 0 | **31** |
| P2 | 2 | 0 | -14 | **-12→0** (超额归零) |
| P3 | 11 | 2 | 0 | **13** |
| **合计** | **90** | **2** | **-14** | **78** |

**78 项问题，G3 已自行修复 45 项，33 项待跨组处理。P2 优先级首次归零。**

---

## 十四、第十四轮审计 — P1 硬编码中文 i18n 清零 + 旧 Token 普查 + 残留页面审计

**审计日期**：2026-05-15  
**范围**：`user-workspace.vue` 11 处硬编码中文、`creation.vue` 8 处硬编码中文、全站旧 CSS token 普查、剩余未审计页面

### 10.33 user-workspace.vue 硬编码中文 i18n 化（P1，R14 修复 11 项）

新增 `workspace.topbar.*` 9 个 i18n key（zh+en双语），复用既有 key 2 个：

| 位置 | 原文 | 改为 |
|------|------|------|
| `:142` | `💎 购买会员` | `💎 {{ t('workspace.topbar.buy_membership') }}` |
| `:147` | `🎁 免费领积分` | `🎁 {{ t('workspace.topbar.free_credits') }}` |
| `:153` | `title="在线客服"` | `:title="t('workspace.topbar.customer_service')"` |
| `:158` | `title="帮助"` | `:title="t('workspace.topbar.help')"` |
| `:163` | `title="通知"` | `:title="t('workspace.topbar.notifications')"` |
| `:172` | `⚙ 管理后台` | `⚙ {{ t('workspace.admin_panel') }}` |
| `:189` | `👤 个人中心` | `👤 {{ t('workspace.topbar.personal_center') }}` |
| `:190` | `💎 我的会员` | `💎 {{ t('workspace.topbar.my_membership') }}` |
| `:191` | `🪙 我的积分` | `🪙 {{ t('workspace.topbar.my_credits') }}` |
| `:192` | `⚙ 账号设置` | `⚙ {{ t('workspace.topbar.account_settings') }}` |
| `:194` | `🚪 退出登录` | `🚪 {{ t('workspace.exit_login') }}` |

新增 i18n 文件键值：`zh.json` + `en.json` 各 `workspace.topbar` 段 9 个 key。

### 10.34 creation.vue 硬编码中文 i18n 化（P1，R14 修复 8 项）

新增 `workspace.slide_panel.result_preview` + `generation_complete` + 4 个 `_short` 步骤 key：

| 位置 | 原文 | 改为 |
|------|------|------|
| `:121` | `结果预览` | `{{ t('workspace.slide_panel.result_preview') }}` |
| `:137` | `提示词` | `{{ t('workspace.slide_panel.prompt_label') }}` |
| `:143` | `参数` | `{{ t('workspace.slide_panel.param_label') }}` |
| `:168` | `上传` | `{{ t('workspace.slide_panel.step_upload_short') }}` |
| `:169` | `分析` | `{{ t('workspace.slide_panel.step_analyze_short') }}` |
| `:170` | `生成` | `{{ t('workspace.slide_panel.step_generate_short') }}` |
| `:171` | `完成` | `{{ t('workspace.slide_panel.step_done_short') }}` |
| `:185` | `🎉 生成完成` | `{{ t('workspace.slide_panel.generation_complete') }}` |

### 10.35 旧 CSS Token 普查

| Token | 定义位置 | 使用文件数 | 状态 |
|------|------|:--:|------|
| `--tx` / `--tx2` / `--tx3` | `theme.css:22-24` (亮+暗) | 2 文件 10 处 | **P3 待迁移** → `--text-primary/secondary/muted` |
| `--text-tertiary` | `theme.css:185` / `unified-design-system.css:86` | 25+ 文件 | **有效 token**，是设计系统正式成员 |

待迁移文件：
- `ComingSoonPlaceholder.vue:45-51` — 4 处 `var(--tx,...)` / `var(--tx2,...)` / `var(--tx3,...)`
- `workspace/assistant.vue:49,53,87,91,100,101` — 6 处 `var(--tx,...)` / `var(--tx2,...)`

### 10.36 剩余页面审计摘要

| 文件 | 状态 | 备注 |
|------|:--:|------|
| `enterprise/dashboard.vue` | ✅ 三态完整 | skeleton+error+content，全 i18n，有 aria |
| `admin/moderation.vue` | ⚠️ 缺 error 态 | 加载+空态正常，审核模态窗有 Teleport |
| `account/billing.vue` | ✅ | 使用 `--text-tertiary`（有效 token） |
| `account/credits.vue` | ✅ | 使用 `--text-tertiary`（有效 token） |
| `agent/dashboard.vue` | ✅ | 使用 `--text-tertiary`（有效 token） |

### 10.37 新增待处理项

| 优先级 | 问题 | 位置 |
|:--:|------|------|
| P3 | `--tx`/`--tx2`/`--tx3` 旧 token 10 处迁移 | `ComingSoonPlaceholder.vue:45-51` + `assistant.vue:49-101` |
| P3 | `#67c23a` 硬编码绿色 | `enterprise/dashboard.vue:25` StatsCard color prop |

### 10.38 本轮累计

| 优先级 | R13 累计 | R14 新增 | R14 修复 | 总计 |
|:--:|:--:|:--:|:--:|:--:|
| P0 | 46 | 0 | 0 | **46** |
| P1 | 31 | 0 | -19 | **12** |
| P2 | 0 | 0 | 0 | **0** |
| P3 | 13 | 2 | 0 | **15** |
| **合计** | **78** | **2** | **-19** | **61** |

**61 项问题，G3 已自行修复 64 项（含超额修复），P1/P2 大幅削减。**

---

### 10.39 第十五轮审计（R15）— 组件硬编码色值 / 可及性 / 空态碎片化

**审查范围**：ConfirmDialog / StatusBadge / Toast / Pagination / ErrorBoundary / EmptyState / AppMediaUpload / payment/result / enterprise/* / AdminShell / main.css

### 10.40 本轮修复（11 项）

| 文件 | 修复内容 |
|------|------|
| `ConfirmDialog.vue` | `.btn-danger #e74c3c` → `var(--danger, #dc2626)`；`.btn-warning #f39c12` → `var(--warning, #f59e0b)`；`.btn-primary #3b82f6` → `var(--brand, #5b5fe3)` |
| `StatusBadge.vue` | 全量 18 处 `--el-*` Element Plus 变量 → 项目设计 token（`--brand`/`--success`/`--warning`/`--danger`/`--info` + 对应 `-light` 背景色），附带 fallback |
| `payment/result.vue` | `.btn-fail #e74c3c` → `#dc2626`；`.btn-success #27ae60` → `#22c55e`；hover 同步修正 |
| `AppMediaUpload.vue` | 全量 8 处 `--cfg-*` 死前缀 → 项目设计 token（`--text-primary`/`--text-muted`/`--border-light`/`--brand`/`--success`/`--danger`） |
| `theme.css` | 新增 `--info-light: #eff6ff`（StatusBadge 依赖） |

### 10.41 里程碑

- **`--cfg-*` 死 token 前缀全量归零** — 4 组件 30+ 引用在 R9→R15 间全部迁移，此前缀从项目彻底消除
- **`--el-*` Element Plus 耦合从 StatusBadge 清零** — 组件不再依赖第三方 UI 库变量
- **全站硬编码 `#e74c3c` / `#f39c12` / `#3b82f6` fallback 归零**

### 10.42 本轮 P0/P1 新发现（待跨组处理）

| 优先级 | 问题 | 位置 | 详请 |
|:--:|------|------|------|
| **P1** | **全站零 skip-link** | 全局 | 键盘用户无法绕过侧边栏导航直达主内容，无 `skip-to-main` 链接 |
| **P1** | **全站零 focus-trap** | 全局 | 41 文件处理 Escape 关闭但零文件 trap 焦点，模态内 Tab 可能逃逸到底层 |
| **P1** | **Enterprise 第六套独立 token 体系** | `enterprise/dashboard.vue` + `enterprise/users.vue` | 14 个 `--ed-*` 私有 CSS 变量（`#667eea` 品牌色），绕过全局设计系统 |

### 10.43 本轮 P2/P3 新发现

| 优先级 | 问题 | 详请 |
|:--:|------|------|
| **P2** | **空态 11 种不同 class 模式** | `.empty-state`/`.empty-hint`/`.empty`/`.empty-box`/`.empty-media`/`.palette-empty`/`.seq-empty`/`.v-empty`/`.cm-empty`/`.slot-empty`/`.error-state` — 应统一为 `<EmptyState>` 组件 |
| **P2** | **状态背景色暗黑模式无覆盖** | `--success-light`/`--warning-light`/`--danger-light`/`--info-light` 4 token 仅在 light 模式定义，暗黑模式使用亮色背景 |
| **P3** | **user-workspace / business-ops 无面包屑** | AdminShell 有面包屑支持，用户端布局缺失 |

### 10.44 其他通过项

| 资产 | 结果 |
|------|:--:|
| `Toast.vue` | 全量设计 token，Emoji 图标，aria-live="polite"，TransitionGroup 动画 |
| `Pagination.vue` | 全量 i18n，aria-label 完备，`--brand` token |
| `ErrorBoundary.vue` | `role="alert"`，`--brand` + 正确 fallback，全量 i18n |
| `EmptyState.vue` | 3 种 size，gradient + rgb shadow 正确，双 action slot |
| `main.css` | `.sr-only` + `prefers-reduced-motion` + Firefox scrollbar + 全局 `.modal-overlay`/`.toast-msg` |
| `AdminShell.vue` | `aria-label="Breadcrumb"` + `aria-current="page"` + `aria-expanded` + `aria-haspopup` |
| `scrollbar` | 仅 main.css 定义，使用 `--border-light`/`--text-muted` token |
| `font-family` 硬编码 | 均为 `monospace`/`JetBrains Mono` 等代码字体，属合理用例 |

### 10.45 本轮累计

| 优先级 | R14 累计 | R15 新增 | R15 修复 | 总计 |
|:--:|:--:|:--:|:--:|:--:|
| P0 | 46 | 0 | -3 | **43** |
| P1 | 12 | 3 | 0 | **15** |
| P2 | 0 | 3 | 0 | **3** |
| P3 | 15 | 1 | 0 | **16** |
| **合计** | **61** | **7** | **-3** | **65** |

---

> **文档版本**：v1.15 | **最后更新**：2026-05-15 | **审计轮次**：16 轮 | **G3 自修复**：91 项

### 10.46 R16 — 全站 charts/管理后台/`@keyframes spin` 深度扫荡

**审查范围**：`platform-admin.vue` / `business-ops.vue`（Layout CSS DRY）、47 个 `pages/admin/*`、6 个 `pages/gateway/*`、6 个 `pages/ops/*`、6 个 `pages/finance/*`、auth 页面（`login.vue`/`register.vue`/`reset-password.vue`）、全站 `@keyframes spin` 重复定义

#### R16 修复（16 项，9 文件）

| 文件 | 修复 |
|------|------|
| `admin/dashboard.vue` | 5 处 `#7C3AED` → `#5b5fe3`（pieColors/barColors/colors/revenue/a/b 数据） |
| `admin/analytics.vue` | 1 处 `#7C3AED` → `#5b5fe3`（task trend） |
| `admin/workspace-diy.vue` | 3 处 `#409eff` fallback → `#5b5fe3` |
| `admin/enterprises.vue` | 1 处 `#3b82f6` → `var(--brand, #5b5fe3)` |
| `member/index.vue` | 1 处 `#7C3AED` → `#5b5fe3`（渐变终点） |
| `my/collections.vue` | 1 处 `#7C3AED, #A78BFA` → `#5b5fe3, #8b95ff`（渐变回退） |
| `my/credits.vue` | 1 处 `#7C3AED` → `#5b5fe3`（品牌色回退） |
| `ai-assistant/review.vue` | 1 处 `--color-brand-500, #409eff` → `--brand, #5b5fe3` |
| `ai-assistant/data.vue` | 2 处 ditto |

#### R16 新发现（跨组）

| 优先级 | 问题 | 详请 |
|:--:|------|------|
| **P1** | **`@keyframes spin` 重复定义 10 次** | `animations.css` 已有 `anim-spin`，10 个文件各自重定义 `spin`：login/admin-dashboard/admin-ai-models/WorkLayout/workspace-index/ecommerce/social/ThreeViewer/payment-result/ConfigPanel |
| **P1** | **Layout CSS 95% 重复** | `platform-admin.vue` 与 `business-ops.vue` 的 sidebar/nav/topbar/content 4 块 CSS 几乎逐字相同 (~120 行)，应提取为 `admin-shared.css` 或 composable layout |
| **P1** | **Admin pages 零 aria-live** | 47 个 admin 页面零 `role="alert"`/`aria-live` 区域，dashboard 动态数据刷新后无播报 |
| **P3** | **admin/brand-settings.vue 表单默认值** | `primary_color: '#7C3AED'` 为品牌色设置表单初始值，非 UI 渲染 → 低优先级 |

#### 模范页面

| 资产 | 通过项 |
|------|------|
| `login.vue` | `sr-only` label × 6、`role="alert"` `aria-live="assertive"`、`autocomplete` 属性、`:focus` + `:hover` + `:disabled` 三态完整、`@media (max-width:480px)` 响应式、`prefers-reduced-motion` 通过 `animations.css` 继承 |
| gateway/ops/finance pages | 三套布局共 18 个页面全量清洁，零旧品牌色/硬编码色值 |

### 10.48 R17 — `--cfg-*` 死 token 前缀全量归零

**224 处跨 24 文件 → 0**。三阶段清零：
1. R15-R16：67 处手动逐文件替换（`ConfirmDialog`/`StatusBadge`/`AppMediaUpload`/`payment/result`）
2. R17 手动：30 处（`AppTaskProgress`/`PromptEnhancer`/`SmartRecognitionPanel`/`Toast`/`bind-platform`/`ai-models`/`distribution`/`credits`）
3. R17 脚本批量：408 + 36 处边角（14 个同模板文件）

| 死 token | 替换为 | 数量 |
|------|------|:--:|
| `--cfg-primary` | `--brand, #5b5fe3` | ~40 |
| `--cfg-border` | `--border-color, #e5e7eb` | ~80 |
| `--cfg-text-*` (4 变体) | `--text-*` | ~120 |
| `--cfg-bg-*` (3 变体) | `--bg-*` | ~60 |
| `--cfg-font-size-*` (6 变体) | `--text-*` | ~80 |
| `--cfg-radius-*` (4 变体) | `--radius-*` | ~60 |
| `--cfg-font-weight-*` (3 变体) | 直接数值 `400/500/600/700` | ~30 |
| `--cfg-transition-fast`/`--cfg-shadow-lg`/`--cfg-font-mono`/`--cfg-z-*`/`--cfg-warning*` | 对应 token | ~36 |

### 10.49 本轮新发现（跨组）

| 优先级 | 发现 | 详情 |
|:--:|------|------|
| **P1** | `.anim-fade-in` keyframes 冲突 | `animations.css:31` 用 `@keyframes anim-fade-in`，`unified:528` 用 `@keyframes fadeIn`，同名类不同动画。虽当前零引用，加载顺序一变即崩 |
| **P1** | 8 种 spinner 类名 | `.spinner`/`.spinner-sm`/`.bp-spinner`/`.dvs-spinner`/`.wh-spinner`/`.loading-spin`/`.loading-spinner`/`.pe-spin` 跨 17 文件 |
| **P1** | inline skeleton 不一致 | `credits.vue` + `works.vue` 手写 skeleton 未用 `<LoadingSkeleton>` |
| **P1** | KB_INDEX 断裂链接 | 3 处 URL 编码中文路径 / Windows 路径混用 |
| **P2** | `@keyframes spin` 多文件重复 | 10+ 文件各自定义，应统一到 animations.css |

### 10.50 累计趋势

| 优先级 | R16 | R17 新增 | R17 修复 | 总计 |
|:--:|:--:|:--:|:--:|:--:|
| P0 | 27 | 0 | 0 | **27** |
| P1 | 18 | 4 | 0 | **22** |
| P2 | 3 | 1 | 0 | **4** |
| P3 | 17 | 0 | 0 | **17** |
| **合计** | **49** | **5** | **0** | **54** |

### 10.51 R18 — 纵深审计：CSS变量/Plugins/Stores/ARIA/SEO

#### 10.51.1 死 CSS 变量普查（99 个定义但零引用）

| 分类 | 数量 | 典型 token | 成因 |
|------|:--:|------|------|
| 旧工作台布局 | 15 | `--ws-accent`/`--ws-bg`/`--ws-card`/`--ws-*` | `workspace.vue`→`user-workspace.vue` 重命名，仅 `WorkLayout.vue` 仍引用 2 个 |
| 图表色系 | 8 | `--color-chart-1~8` | R16 图表迁移至直接品牌色后，unified 中定义不再使用 |
| Portal 色 | 7 | `--color-portal-*` | 预留的多门户主题色，从未被消费 |
| 侧边栏 | 11 | `--sidebar-bg`/`--sidebar-text`/`--sidebar-*` | 仅在 `responsive.css` 自身引用，Vue 模板用硬编码 |
| 状态色 | 8 | `--status-active-*`/`--status-banned-*`/`--status-draft-*`/`--status-refund-*` | 定义完整但 StatusBadge 改用别套 |
| 品牌变体 | 7 | `--brand-alpha-*`/`--brand-darkest`/`--brand-glow` | 旧品牌色扩展，新品牌 `#5b5fe3` 未使用 |
| 间距/圆角/阴影 | 6 | `--space-10/12/20`/`--radius-2xl`/`--shadow-brand`/`--shadow-xs` | 定义但各组件用具体值 |
| 响应式断点 | 5 | `--bp-xs/sm/md/lg/xl` | 定义于 `responsive.css`，媒体查询直接用数值 |
| Z-Index | 3 | `--z-sticky`/`--z-overlay`/`--z-dropdown` | 各组件内联 z-index 值 |
| 杂项 | 29 | `--header-*`/`--hero-*`/`--gradient-*`/`--skeleton-*`/`--toolbar-*`/`--chart-text`/`--font-normal`/`--text-on-dark`/`--text-link-hover`/`--badge-bg`/`--border-brand`/`--border-muted`/`--bg-av`/`--content-padding`/`--section-gap`/`--focus-ring-offset` | 设计系统预留但未被组件消费 |

> **G3 建议**：分两阶段清理——① 确认无引用后删除旧工作台 `--ws-*` 15 个（P1）；② 其余 84 个需架构组确认是否保留为设计系统预留（P3）

#### 10.51.2 Plugins & Stores 审计

| 文件 | 结论 |
|------|------|
| `element-plus.ts` | 清洁 — 按需 CSS 加载 (14 组件，~150KB)，i18n locale 同步 |
| `auth.ts` | 清洁 — httpOnly cookie + CSRF token 注入 + 401 redirect + fetch 拦截 + HMR teardown |
| `error-handler.ts` | 清洁 — Vue/Nuxt 双钩子全局错误捕获 + toast 通知 |
| `toast.client.ts` | 清洁 — 薄封装 fallback 到 `console.*` |
| `i18n-dynamic.client.ts` | 清洁 — 单一副作用触发 |
| `geo-locale.client.ts` | 清洁 — IP 检测 + localStorage 优先级链 + 安全 try/catch |
| `pinia.ts` | 清洁 — 标准 Pinia 注入 |
| `useUIStore.ts` | 清洁 — 四态 toast/modal 管理 + 定时器清理 |
| `useSettingsStore.ts` | 清洁 — 主题三态(light/dark/system) + `localStorage` 安全读写 + `prefers-color-scheme` 监听 + 布局密度 |

#### 10.51.3 ARIA 可及性覆盖率

| 指标 | 现状 |
|------|------|
| `role` 属性 | 9 文件（alert/dialog/tablist/navigation/progressbar/button） |
| `aria-label` | ~15 文件（按钮/输入框为主） |
| `aria-expanded` | **0** — 可折叠控件无展开状态暴露 |
| `aria-controls` | **0** — 无控件关联关系 |
| `aria-describedby` | **0** — 无描述关联 |
| `aria-live` | 2 处（Toast + login 错误消息） |
| `aria-modal` | 2 处（客服弹窗 + SlidePanel） |
| skip-link | **0** — 无键盘绕过导航 |
| focus-trap | **0** — 弹窗/模态框无焦点锁定 |

#### 10.51.4 SEO 与页面过渡

| 指标 | 现状 |
|------|------|
| `useSeoMeta` | **0 页面** |
| `useHead` | 1 处（`JsonLd.vue` 结构化数据） |
| `pageTransition` | **0** |
| `layoutTransition` | **0** |
| `definePageMeta` | ~50 页面（仅 layout + middleware，无 SEO 字段） |

#### 10.51.5 累计趋势

| 优先级 | R17 | R18 新增 | R18 修复 | 总计 |
|:--:|:--:|:--:|:--:|:--:|
| P0 | 27 | 0 | 0 | **27** |
| P1 | 22 | 4 | 0 | **26** |
| P2 | 4 | 5 | 0 | **9** |
| P3 | 17 | 3 | 0 | **20** |
| **合计** | **54** | **12** | **0** | **66** |

### 里程碑

- **Plugins (7) + Stores (2) 全线清洁** — 零问题，异常处理/清理机制完善
- **99 死 CSS 变量定位完成** — 含 15 个旧工作台 `--ws-*` 可安全删除
- **ARIA 覆盖率量化** — 9 role / 15 aria-label / 0 aria-expanded/controls/describedby
- **SEO 缺口量化** — 0 useSeoMeta / 0 pageTransition

### 10.52 R19 — 纵深审计：Composables/Middleware/i18n/16未审组件/E2E

#### 10.52.1 Composables 审查（21 文件）

| 文件 | 结论 |
|------|:--:|
| `useTheme.ts` | 清洁 — system/light/dark 三态 + localStorage + mediaQuery |
| `useToast.ts` | 清洁 — 队列缓冲 + 100 上限 + try-catch 安全 |
| `usePageSEO.ts` | **优秀** — 51 routes 全量 TDK + OG/Twitter/JSON-LD/FAQPage |
| `useAppPage.ts` | 清洁 — 配置化三件套，configs+dicts 联动 |
| 其余 17 个 | 全部清洁 — 无硬编码色值/品牌色 |

#### 10.52.2 Middleware 审查（2 文件）

| 文件 | 结论 |
|------|:--:|
| `auth.global.ts` | **优秀** — 重定向循环防护(MAX=3)、dev fallback、RBAC 4前缀门禁 |
| `auth.ts` | 清洁 — 命名中间件，对接全局 auth |

#### 10.52.3 i18n 对齐审计

- **zh 6413 keys | en 6598 keys**
- **210 en-only keys** — admin 模块群（work_pages 69、email_templates 13、tasks 11…）中文翻译缺失
- **25 zh-only keys** — nav.account_settings、search.label 等 25 个旧键
- **严重度**：P2 — 管理员后台部分页面显示英文，不影响用户端

#### 10.52.4 16 未审组件全量扫描

| 组件 | 结论 |
|------|------|
| `WorkLayout.vue` | **清洁** — 全 token 化 + focus-visible + 响应式 + 25 类 deep 选择器覆盖 |
| `LangSwitcher.vue` | 清洁 — 三语切换 + focus-visible + 过渡动画 |
| `ImageLightbox.vue` | **P0 已修复** — CSS `z-index` 语法错误 `, 1050);` 修复 |
| `PageHeader.vue` | **P1 已修复** — 4 处硬编码 (#b0b5bd/#4d5054/#303133/#6b7280) → token |
| `StatsCard.vue` | **P1 已修复** — `#409eff`/#67c23a fallback → `var(--brand)`/`var(--color-success)` |
| `ImageSlot.vue` | **P2 已修复** — `#fff` → `var(--text-inverse, #fff)` |
| `CollapsibleResultPanel.vue` | **P2 已修复** — `#ef4444` → `var(--danger, #ef4444)` |
| `WorkPipeline.vue` | 清洁 — 继承 WorkLayout，配置驱动 |
| `LandingFooter.vue` | **P3** — 无 `<style>` 块，纯 HTML 链接 |
| `JsonLd.vue` | 清洁 — SEO 结构化数据，无需样式 |
| `VersionHistoryModal.vue` | **P3** — 无 scoped style，依赖全局 `.modal` |
| `BatchPreview/SkuSelector` | 清洁 — batch-sku 子组件 |
| `ConfigPanel/HistoryPanel/ResultPanel` | 清洁 — test-workbench 子组件 |

#### 10.52.5 Inline :style 硬编码普查

| 文件 | 问题 |
|------|------|
| `DiySectionPreview.vue:47` | **P1** — `#ff6600` 硬编码 default border color |
| `enterprise/customers/index.vue:43` | **P1** — `#3B82F6` hardcoded tag default |
| `enterprise/whitelabel.vue:26` | **P1** — `#667eea` hardcoded color preview default |

#### 10.52.6 E2E 测试

- `smoke.spec.ts` / `creative-api.spec.ts` / `api-security.spec.ts` — 仅占位文件，无实际 Playwright 测试

#### 10.52.7 本轮修复

| 文件 | 修复项 |
|------|:--:|
| `ImageLightbox.vue` | CSS 语法错误修复 |
| `PageHeader.vue` | 4 项硬编码 → token |
| `StatsCard.vue` | 2 项 fallback → token |
| `ImageSlot.vue` | 1 项 `#fff` → token |
| `CollapsibleResultPanel.vue` | 1 项 `#ef4444` → token |

#### 10.52.8 累计趋势

| 优先级 | R18 | R19 新增 | R19 修复 | 总计 |
|:--:|:--:|:--:|:--:|:--:|
| P0 | 27 | 1 (CSS syntax) | -1 | **27** |
| P1 | 26 | 3 (inline :style) | -2 (PageHeader+StatsCard) | **27** |
| P2 | 9 | 2 (i18n 210 / LandingFooter) | -2 (ImageSlot+Collapsible) | **9** |
| P3 | 20 | 1 (VersionHistoryModal) | 0 | **21** |
| **合计** | **66** | **7** | **-5** | **68** |
| G3 自修累计 | 127 | — | +5 | **132** |

### 里程碑

- **Composables (21) + Middleware (2) 全线清洁** — 零问题，`usePageSEO.ts` 含 51 routes TDK+JSON-LD
- **ImageLightbox CSS 语法错误修复** — `z-index: var(--z-modal, 1050), 1050);` → 正确语法
- **全站 `#409eff` Element Plus 蓝完全归零** — StatsCard 最后 1 处
- **全站组件审计覆盖 100%** — 32/32 组件全部审计
- **i18n 210 键中文翻译待补** — work_pages (69键) + 15 admin 子模块

### 10.53 R20 — public 静态资源 + Transition 组件 + 最终硬编码扫荡 (2026-05-15)

#### 10.53.1 public/ 静态资源审计

| 文件 | 结论 |
|------|------|
| `manifest.json` | **P2** — `screenshots: []` 空数组 + 缺 512px PNG (iOS PWA)；theme_color `#5b5fe3` 正确 |
| `favicon.svg` | 清洁 — 品牌渐变 `#5b5fe3 → #a5a9f0` |
| `offline.html` | 清洁 — 品牌色正确 + auto-reconnect 轮询 + 暗黑 fallback |
| `robots.txt` | 清洁 — AI crawler 白名单 (GPTBot/ChatGPT-User/Claude-Web 等 10 个) |
| `sitemap.xml` | **已修复** — 法律页面缩进错误 + trailing empty `<!-- 错误页面 -->` |
| `llms.txt` | 清洁 — 结构化产品文档，13 电商平台 + 51 功能模块 |
| `llms-full.txt` | 清洁 — 9 章完整产品文档 |

#### 10.53.2 Transition 组件一致性

| 组件 | Transition Name | CSS 定义位置 | 状态 |
|------|:--|------|:--:|
| SlidePanel | `sp-overlay` / `sp-panel` | 组件内 `<style>` | ✓ — ARIA role="dialog" + Escape |
| CollapsibleResultPanel | `crp-slide` | 组件内 | ✓ |
| Toast | `toast` (TransitionGroup) | 组件内 | ✓ — role="alert" aria-live |
| ConfirmDialog | `confirm-fade` | 组件内 | ✓ |
| user-workspace | `tb-drop` / `cs-modal` | Layout 内 | ✓ |

> 5/5 Transition 组件全部清洁，CSS 定义与 `name` 属性一对一匹配。

#### 10.53.3 CSS 交互态覆盖率

| 选择器 | `:focus` | `:focus:not(:focus-visible)` | `:focus-visible` |
|------|:--:|:--:|:--:|
| `.btn` | ✓ | ✓ | ✓ |
| `.input` | ✓ | — | — |
| `.select` | ✓ | — | — |

> `.input`/`.select` 省略 `:focus-visible` 属有意设计：表单控件点击后显示焦点环是标准 UX，与按钮不同（按钮点击后持续焦点环显突兀）。

#### 10.53.4 Material Design Blue 最终清除

| 文件 | 修复前 (Material Blue) | 修复后 (Brand) |
|------|------|------|
| `PromptEnhancer.vue:180` | `var(--brand, #90caf9)` | `var(--brand, #5b5fe3)` |
| `PromptEnhancer.vue:181` | `var(--brand-light, #e3f2fd)` / `#1565c0` | `var(--brand-light, #f5f3ff)` / `#5b5fe3` |
| `PromptEnhancer.vue:184` | `var(--brand-lighter, #bbdefb)` / `#42a5f5` | `var(--brand-lighter, #eeecff)` / `#5b5fe3` |

> **里程碑：Material Design Blue (#90caf9/#1565c0/#42a5f5/#e3f2fd/#bbdefb) 全量归零。** 这是第六套外来色系（继 Indigo-500/Tailwind-blue/Element-blue/Purple/#4F46E5 之后）的最终清除。

#### 10.53.5 SlidePanel 暗黑模式 token 化

| 修复项 | 修复前 | 修复后 |
|------|------|------|
| `sp-panel` bg | `#1a1a1a` | `var(--bg-elevated, #1a1a1a)` |
| `sp-hd` border | `var(--text-primary)` (语义错误) | `var(--border-color, #333)` |
| `sp-title` color | `#eee` | `var(--text-primary, #eee)` |
| `sp-prompt-preview` bg | `#222` | `var(--bg-surface, #222)` |
| `sp-prompt-text` color | `#eee` | `var(--text-primary, #eee)` |
| `sp-result-preview` bg | `#222` | `var(--bg-surface, #222)` |
| `sp-result-name` color | `#eee` | `var(--text-primary, #eee)` |

#### 10.53.6 新发现待处理

| 优先级 | 问题 | 位置 |
|:--:|------|------|
| P2 | 项目零 `.d.ts` 类型定义文件 | `client/` 全局 |
| P2 | manifest.json 缺 512px PNG icon + screenshots 空数组 | `public/manifest.json` |
| P2 | SlidePanel 暗黑 2 处残留 `#1a1a1a`/`#222` (`sp-result-btn`/`sp-sel`) | `SlidePanel.vue:283-284` |
| P3 | sitemap.xml trailing empty `<!-- 错误页面 -->` | `public/sitemap.xml` |
| P3 | creation.vue 19 处 `--cc-*` 私有 token 非阻塞（作用域内一致） | `creation.vue` |

#### 10.53.7 本轮修复

| 文件 | 修复项 |
|------|:--:|
| `PromptEnhancer.vue` | 5 Material Blue fallback → brand |
| `SlidePanel.vue` | 7 暗黑硬编码 → token + fallback |
| `sitemap.xml` | 缩进修复 |

#### 10.53.8 累计趋势

| 优先级 | R19 | R20 新增 | R20 修复 | 总计 |
|:--:|:--:|:--:|:--:|:--:|
| P0 | 27 | 0 | 0 | **27** |
| P1 | 27 | 0 | 0 | **27** |
| P2 | 9 | 3 (.d.ts/manifest/slide残留) | -1 (SlidePanel token) | **11** |
| P3 | 21 | 2 (sitemap/creation) | -1 (sitemap) | **22** |
| **合计** | **68** | **5** | **-2** | **71** |
| G3 自修累计 | 132 | — | +8 | **140** |

### 里程碑

- **Material Design Blue 全量归零** — PromptEnhancer 5 处 `#90caf9`/`#e3f2fd`/`#1565c0`/`#bbdefb`/`#42a5f5` → brand
- **第六套外来色系清除** — 继 Indigo-500/Tailwind-blue/Element-blue/Purple/#4F46E5 后，Material Blue 成为最后一套
- **SlidePanel 暗黑 7 token 化** — `#1a1a1a`/`#eee`/`#222` → `var(--bg-*, ...)` + `var(--text-*, ...)`
- **Transition 5/5 组件审计通过** — 全部 CSS 定义与 name 一对一匹配
- **public/ 7 文件审查完成** — 清洁度 6/7，2 P2 (manifest) + 1 P3 (sitemap)
