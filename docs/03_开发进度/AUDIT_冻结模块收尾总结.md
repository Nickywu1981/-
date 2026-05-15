# Movio AI 冻结模块收尾总结

**日期**: 2026-05-15  
**关联决策**: [Decision 024 — 全链路分阶段战略](decisions/2026-05-14_024_full_chain_phased_strategy.md)

---

## 概述

根据「数据挖掘→RPA→智能体→龙虾→画布」分阶段补全战略，当前 6 个模块仅保留地基，上层业务全部冻结。

---

## 1. 智能体 (Agent) — 完成度 15%

### 已做内容
| 类型 | 文件 | 说明 |
|------|------|------|
| ADK 框架 | `server/src/adk/` (26 .js, 2,115行) | Agent/AgentArray/Runner/Session/Tool 核心类 |
| 13 个内置 Agent | `adk/agents/` | memoryAgent/attentionAgent/contextAgent/localizeAgent/contentAgent/guardAgent/visualAgent/healthAgent/intentAgent/detailAgent/expandAgent/storyboardAgent/dispatchAgent |
| 编排器 | `adk/orchestration/ecommerceOrchestrator.js` | 电商全流程串行协调（主图→场景→详情→视频→审核→分发） |
| 控制器 | `adkController.js` + `agentController.js` | `/api/adk/*` + `/api/agent/*` |

### 未开发核心功能
- `adk/tools/` 目录完全为空 — Agent 无工具可调用
- G3-G6 四个角色组未建立
- Agent 间通信/协作机制未实现
- 长期记忆/向量检索未对接
- 无自主代码生成和执行能力

### 重启条件
- Python 数据挖掘模块完成 (提供外部数据源)
- RPA 模块完成 (提供浏览器/桌面操作能力)
- 届时开发周期: 估 4-6 周

---

## 2. 工作流 (Workflow) — 完成度 40%

### 已做内容
| 类型 | 文件 | 说明 |
|------|------|------|
| 工作流定义 | `workflowDefinitions.js` | 7 个工作流步骤定义（图片/视频/详情/场景/发布/分发/审核） |
| 统一引擎 | `unifiedWorkflowEngine.js` (37KB) | 步骤执行、进度回调、结果汇总 |
| 管线接口 | `WorkPipeline` 前端组件 | 41 个创作页面 → 配置驱动模式 |
| 队列管理 | `queueManager.js` | BullMQ 4 队列 + 死信 + 统计 |

### 未开发核心功能
- 条件分支/并行执行/循环（当前仅线性顺序）
- 可视化工作流编辑器
- 步骤失败自动重试/补偿事务
- 步骤间数据转换管道

### 重启条件
- 图片/视频工作流稳定运行后
- 届时开发周期: 估 2-3 周

---

## 3. RPA 自动化 — 完成度 2%

### 已做内容
| 类型 | 说明 |
|------|------|
| `automationRoutes.js` | 8 端点 (定时任务 CRUD) |
| `automationController.js` | 路由转发 |
| `automationService.js` | setTimeout 模拟（非真实自动化） |
| `automationDao.js` | 任务数据持久化 |

### 未开发核心功能
- 浏览器自动化 (Playwright/Puppeteer)
- 桌面操作能力
- UI 元素识别和录制回放
- 跨平台脚本兼容层

### 重启条件
- Python 数据挖掘模块完成
- 届时开发周期: 估 4-6 周

---

## 4. Python 数据挖掘 — 完成度 0%

### 已做内容
- 无。项目零 Python 代码。

### 未开发核心功能
- 竞品数据采集
- 电商平台热卖趋势分析
- 价格监控/商品数据爬取
- 数据清洗和结构化

### 重启条件
- 全链路战略第二阶段
- 届时开发周期: 估 4-6 周

---

## 5. 龙虾调度 (Lobster) — 完成度 0%

### 已做内容
- 无。明确不开发，仅预留架构占位。

### 未开发核心功能
- 多 Agent 协同调度
- 任务优先级和资源分配
- 去中心化调度和故障转移
- Agent 生命周期管理

### 重启条件
- 全链路战略第五阶段
- 属于终极功能，短期内无开发计划

---

## 6. 画布可视化 (Canvas) — 完成度 10%

### 已做内容
| 类型 | 文件 | 说明 |
|------|------|------|
| DIY 编辑器 | `client/pages/diy/` (3页) | 编辑器/列表/预览 |
| WorkPipeline | `client/components/work/` | 41 页配置驱动管线 |
| DIY Schema | `client/types/diy.ts` (182行) | 组件层面板定义 |

### 未开发核心功能
- 树形画布数据模型（B1 — Decision 022）
- 组件注册表 + 动态渲染器
- 拖拽式组件重组
- 画布与 WorkPipeline 集成（B3）
- 实时预览和撤销/重做

### 重启条件
- 全链路战略最后阶段
- 届时开发周期: 估 4-6 周 (B1-B4)

---

## 当前阶段明确规则

```
✅ 做: 图片/视频 5 条工作流 + 现有地基维护
❄️ 冻: 智能体/RPA/Python/Lobster/画布 — 仅保留地基，不开发业务
⏳ 后补: Python → RPA → 智能体 → Lobster → 画布（按序触发，单阶段完成后再启动下一阶段）
```

### 地基维护策略
- ADK 文件保留不删，不新增功能
- 工作流引擎仅修复 BUG，不添加条件分支/并行
- RPA 路由/表结构保留，不做自动化集成
- 画布 B2+B4 代码保留，不在旧模型上新增功能
