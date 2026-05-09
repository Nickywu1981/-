# Movio AI — UI 设计规范文档

> **编写组**：G3 UI 设计组（UI-Designer 🔴主 / Doc-Writer 🟡辅）
> **审核组**：G1 架构规划组（Architect）
> **版本**：v1.0 | **日期**：2026-05-08

---

## 一、品牌视觉体系

### 1.1 品牌主色

| 色阶 | 色值 | 用途 |
|------|------|------|
| 50 | `#F5F3FF` | 浅紫背景 |
| 100 | `#EDE9FE` | 卡片悬停 |
| 300 | `#C4B5FD` | 边框聚焦 |
| 500 | `#8B5CF6` | 次要按钮/链接 |
| 600 | **`#7C3AED`** | **品牌主色/主按钮/Logo** |
| 700 | `#6D28D9` | hover 加深 |
| 900 | `#4C1D95` | 深紫强调 |

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
| 0 | `#FFFFFF` | `#0F172A` | 页面背景 |
| 50 | `#F8FAFC` | `#1E293B` | 卡片背景 |
| 100 | `#F1F5F9` | `#334155` | 输入框背景 |
| 200 | `#E2E8F0` | `#475569` | 边框 |
| 400 | `#94A3B8` | `#64748B` | 次要文字 |
| 700 | `#334155` | `#CBD5E1` | 正文 |
| 900 | `#0F172A` | `#F8FAFC` | 标题 |

---

## 二、布局规范

### 2.1 断点

| 名称 | 宽度 | 侧边栏 | 栅格 |
|------|------|:--:|------|
| **Mobile** | < 640px | 隐藏 | 1 列 |
| **Tablet** | 640-1024px | 收缩 | 2 列 |
| **Desktop** | > 1024px | 240px | 灵活 |
| **Wide** | > 1440px | 240px | 最大 1200px |

### 2.2 间距体系（8px 基准）

| Token | 值 | 用途 |
|------|------|------|
| `xs` | 4px | 图标/文字间距 |
| `sm` | 8px | 组件内部间距 |
| `md` | 16px | 卡片内边距 |
| `lg` | 24px | 区块间距 |
| `xl` | 32px | 页面大区块 |
| `2xl` | 48px | Hero 区上下 |
| `3xl` | 64px | 页面级分隔 |

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

### 3.1 按钮

| 类型 | Class | 用途 |
|------|------|------|
| 主按钮 | `bg-primary text-white rounded-lg px-5 py-2.5 hover:bg-primary-700` | 主要操作 |
| 次按钮 | `border-primary text-primary rounded-lg px-5 py-2.5 hover:bg-primary/5` | 次要操作 |
| 危险按钮 | `bg-danger text-white rounded-lg px-5 py-2.5 hover:bg-red-700` | 删除操作 |
| 幽灵按钮 | `text-primary hover:bg-primary/5 rounded-lg px-3 py-1.5` | 表格内操作 |
| 图标按钮 | `w-9 h-9 flex-center rounded-lg hover:bg-gray-100` | 工具栏 |

### 3.2 输入框

```
默认：border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/20
错误：border-danger
禁用：bg-gray-100 cursor-not-allowed
```

### 3.3 卡片

```
标准卡：bg-white rounded-xl shadow-sm border p-4
悬停卡：hover:shadow-md hover:-translate-y-0.5 transition-all
功能卡：bg-white rounded-2xl p-6 border cursor-pointer hover:shadow-lg
```

### 3.4 标签/Badge

```
圆角：rounded-full px-2.5 py-0.5 text-xs font-medium
色系：primary/success/warning/danger/info 标准色对应
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

| 场景 | 属性 | 时长 |
|------|------|:--:|
| 按钮悬停 | `background-color, transform` | 150ms |
| 卡片悬停 | `box-shadow, transform` | 200ms |
| 侧边栏 | `translateX` | 250ms ease-out |
| 抽屉弹出 | `opacity, scale(0.95→1)` | 200ms ease-out |
| 骨架屏 | `pulse` 动画 | 1.5s infinite |
| 页面切换 | `opacity` fade | 200ms |

---

## 七、字体层级

| 层级 | 大小 | 行高 | 字重 | 用途 |
|------|------|------|------|------|
| H1 | 28px | 36px | 700 | 页面主标题 |
| H2 | 22px | 30px | 600 | 区块标题 |
| H3 | 18px | 26px | 600 | 卡片标题 |
| H4 | 15px | 22px | 500 | 小标题 |
| Body | 14px | 20px | 400 | 正文 |
| Small | 12px | 16px | 400 | 辅助/时间 |
| XS | 11px | 14px | 400 | 标签/角标 |

---

## 八、图标规范

- **首选库**：Heroicons v2（24px outline）
- **备用**：Lucide Icons
- **尺寸**：16/20/24/32px
- **颜色**：继承当前文字色或使用 `text-gray-400`
