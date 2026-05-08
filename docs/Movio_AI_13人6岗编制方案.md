# Movio AI — 13 人团队 · 6 大岗位编制方案

> **生效日期**: 2026-05-08  
> **适用范围**: Movio AI 电商 SaaS 项目及后续所有项目  
> **原则**: AI 自动配岗、自动分工、自动排班，无需人工指定  

---

## 一、6 大岗位定义（永久固定）

| 编号 | 岗位名称 | 一句话职责 | 禁止越界 |
|:--:|------|------|------|
| G1 | **架构规划** | 技术选型、分层标准、规范制定、代码审查 | 不写业务代码 |
| G2 | **项目统筹** | 需求分析→PRD→任务拆分→分派→进度追踪→验收 | 不写任何代码 |
| G3 | **UI 设计** | CSS变量、主题/暗黑/响应式/动效、设计系统维护 | 不改业务逻辑和接口 |
| G4 | **前端开发** | Nuxt3页面/组件/Composable/Store/Pinia/API接入 | 不碰后端和数据库 |
| G5 | **后端开发** | Controller/Route/Middleware/Service/业务逻辑 | 不碰数据库SQL |
| G6 | **数据库接口** | DAO/SQL/Redis/MinIO/数据迁移/API契约校验 | 不写业务逻辑 |

---

## 二、本项目人员分配（13 人 → 6 岗）

### G1 架构规划组（2 人）

| 角色 | 姓名代号 | 主/辅 | 具体职责 |
|------|------|:--:|------|
| 组长 | `Architect` | 🔴 主 | 10层架构维护、技术选型审批、全栈Code Review、CLAUDE.md架构章节 |
| 组员 | `Security-Auditor` | 🟡 辅 | 安全架构审计、CSP/CSRF/CORS规范、Zod覆盖率扫描、SQL注入检测 |

### G2 项目统筹组（2 人）

| 角色 | 姓名代号 | 主/辅 | 具体职责 |
|------|------|:--:|------|
| 组长 | `Orchestrator` | 🔴 主 | 任务拆分分派、进度追踪、跨组协调、五维质量验收、风险预警 |
| 组员 | `Product-Manager` | 🔴 主 | 需求分析→用户故事→PRD→功能优先级矩阵→验收标准→埋点设计 |

### G3 UI 设计组（2 人）

| 角色 | 姓名代号 | 主/辅 | 具体职责 |
|------|------|:--:|------|
| 组长 | `UI-Designer` | 🔴 主 | 全局CSS变量、theme.css、品牌紫体系、暗黑模式、响应式断点 |
| 组员 | `Doc-Writer` | 🟡 辅 | UI组件文档、设计系统Storybook、Swagger UI美化 |

### G4 前端开发组（2 人）

| 角色 | 姓名代号 | 主/辅 | 具体职责 |
|------|------|:--:|------|
| 组长 | `Frontend-A` | 🔴 主 | 业务页面开发（pages/work/ + pages/admin/ + pages/my/） |
| 组员 | `Frontend-B` | 🔴 主 | 基础设施（Composables/Stores/Layouts/Components/Plugins/useApi） |

> **分工铁律**: Frontend-A 不写 Composable/Store，Frontend-B 不写业务页面。需协作时由 Orchestrator 协调。

### G5 后端开发组（2 人）

| 角色 | 姓名代号 | 主/辅 | 具体职责 |
|------|------|:--:|------|
| 组长 | `Backend-A` | 🔴 主 | Controller/Route/Middleware/Zod Schema/API契约定义 |
| 组员 | `Rules-Keeper` | 🟡 辅 | 规范执行监督、audit-rules自动审计、CLAUDE.md数据同步 |

> **分工铁律**: Backend-A 不写 Service 和 DAO，Rules-Keeper 不写业务代码。

### G6 数据库接口组（3 人）

| 角色 | 姓名代号 | 主/辅 | 具体职责 |
|------|------|:--:|------|
| 组长 | `Backend-B` | 🔴 主 | Service业务逻辑/DAO数据访问/SQL迁移/tenantPool多租户 |
| 组员 | `DevOps` | 🟡 辅 | MySQL/Redis/MinIO运维、BullMQ队列、连接池配置 |
| 组员 | `QA-Engineer` | 🟡 辅 | API接口测试、数据完整性校验、回归测试 |

---

## 三、人员全景图

```
                    ┌─────────────────────┐
                    │   项目统筹组 (G2)     │
                    │  Orchestrator 🔴主    │
                    │  Product-Manager 🔴主 │
                    └─────────┬───────────┘
                              │ 分派任务
          ┌───────────────────┼───────────────────┐
          │                   │                   │
    ┌─────▼─────┐      ┌─────▼─────┐      ┌─────▼─────┐
    │架构规划 G1 │      │ UI设计 G3  │      │前端开发 G4 │
    │Architect🔴│      │UI-Designer🔴│    │Frontend-A🔴│
    │Security🟡 │      │Doc-Writer🟡│     │Frontend-B🔴│
    └─────┬─────┘      └─────┬─────┘      └─────┬─────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              │
                    ┌─────────▼───────────┐
                    │    后端开发组 (G5)    │
                    │   Backend-A 🔴主     │
                    │   Rules-Keeper 🟡辅   │
                    └─────────┬───────────┘
                              │
                    ┌─────────▼───────────┐
                    │   数据库接口组 (G6)   │
                    │   Backend-B 🔴主     │
                    │   DevOps 🟡辅        │
                    │   QA-Engineer 🟡辅   │
                    └─────────────────────┘
```

---

## 四、协作流程（标准化）

### 日常开发流程

```
用户需求
   ↓
[G2 统筹组] Product-Manager → PRD + 验收标准
            Orchestrator → 拆分任务单
   ↓
[G1 架构组] Architect 审核技术方案（涉及新模块/新依赖时）
   ↓
[G2 统筹组] Orchestrator 并行分派
   ├── [G3 UI组]    UI-Designer 出样式
   ├── [G4 前端组]  Frontend-A 写页面 / Frontend-B 写基础设施
   ├── [G5 后端组]  Backend-A 写Controller/Route
   └── [G6 数据组]  Backend-B 写Service/DAO
   ↓
[G1 架构组] Architect + Security-Auditor Code Review
   ↓
[G6 数据组] QA-Engineer 测试
   ↓
[G2 统筹组] Orchestrator 五维验收 → Product-Manager PRD确认 → 交付
```

### 铁律

| # | 规则 |
|:--:|------|
| 1 | 各组只做本组职责，跨组需 Orchestrator 审批 |
| 2 | 新增依赖/技术必须 Architect 审批 |
| 3 | 同一文件不同组不可同时编辑 |
| 4 | G5（后端Controller）不写SQL；G6（数据组）不定义HTTP接口 |
| 5 | G4（前端页面）不写Store/Composable；G4（前端基础设施）不写业务页面 |

---

## 五、后续项目自动配岗规则

> **适用所有未来项目**，由 AI 自动执行，无需人工指定。

| 项目规模 | 判断标准 | 自动配置 |
|------|------|------|
| **小型** | ≤30页面 + ≤10API | G1(1人) + G2(1人) + G3(1人) + G4(1人) + G5(1人) + G6(1人) = **6人** |
| **中型** | 30-80页面 + 10-25API | G1(1) + G2(2) + G3(1) + G4(2) + G5(1) + G6(2) = **9人** |
| **大型**（本项目） | 80-150页面 + 25-40API | G1(2) + G2(2) + G3(2) + G4(2) + G5(2) + G6(3) = **13人** |
| **超大型** | 150+页面 + 40+API | 按需从13人池扩编，每组+1人，上限13人 |

**自动判断流程**：
1. AI 扫描项目文件数 → 判定规模等级
2. AI 按等级自动从13人池分配人员到6岗
3. AI 自动输出《岗位配置方案》
4. Orchestrator 收到方案后立即开始分工

---

## 六、当前项目执行入口

**Phase 1（P0 安全架构修复）立即启动**：

| 任务 | 负责组 | 人员 |
|------|:--:|------|
| 25个DAO接入tenantPool | G6 | Backend-B 🔴 |
| adminAuth接入JWT黑名单 | G5 + G1 | Backend-A 🔴 + Security-Auditor 🟡 |
| RBAC接入10+关键路由 | G5 + G1 | Backend-A 🔴 + Security-Auditor 🟡 |
| 8个直写SQL Service迁移到DAO | G6 | Backend-B 🔴 |
| 回归测试 | G6 | QA-Engineer 🟡 |
| 统筹验收 | G2 | Orchestrator 🔴 |

---

> **本方案自 2026-05-08 起生效。后续所有项目按 §五 自动配岗规则执行，无需人工干预。**
