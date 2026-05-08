# MEMORY — 长期核心记忆（Movio AI）

> 最后更新：2026-05-07 | 版本：v2.0

---

## 一、项目信息

- **项目名称**：Movio AI 电商视觉创作平台
- **项目定位**：服务国内+跨境13大平台的AI电商素材生成SaaS工具
- **项目状态**：MVP阶段，69页面+32路由+35控制器+161用例

## 二、技术栈（永久锁定）

- **后端**：Node.js + Express + MySQL 8.0 + Redis + Cluster
- **前端**：Nuxt3 + Vue3 + TypeScript + SSR
- **AI模型**：多模型适配层（OpenAI / Claude / Stable Diffusion 等）
- **存储**：MinIO 本地对象存储
- **部署**：Docker + Nginx + PM2

## 三、核心架构

### 分层架构（6+5层）
- 后端：Controller → Service → DAO（+ ModelAdapter/PromptTemplate/OutputFormatter）
- 前端：Page → Component → Composable/Store → API Layer → Middleware

### 业务模块（14个）
- B1-B7 基础功能：用户认证/管理后台/站点配置
- B8-B14 AI能力：图片生成/视频生成/批量处理/高级图像/高级视频/商业化/跨境适配

### 素材管线
```
用户输入 → 提示词增强 → 模型调用 → 后处理 → 质量审核 → 存储/CDN
```

### 安全体系
- API Key 加密存储（AES-256）
- 提示词注入防护 + 内容安全审核
- JWT鉴权 + express-rate-limit + Helmet + CSP

## 四、记忆体系

### 核心规则文件（17个）
- `CLAUDE.md` — AI行为规则书（19章，400+行）
- `memory/MEMORY.md` — 记忆索引
- `memory/project_tech_stack.md` — 技术栈与三阶段规划
- `memory/feedback_dev_rules.md` — 四步思考+前后端分离+分层架构
- `memory/thinking_process_rule.md` — 固定思考流程
- `memory/coding_conventions.md` — 编码规范
- `memory/ui_capability_matrix.md` — 11项UI自检清单
- 等共17个记忆文件

### 访问地址
- 首页：`http://localhost:3000`
- 登录：`http://localhost:3000/login`（`demo` / `demo123`）
- 工作台：`http://localhost:3000/workspace`
- 管理后台：`http://localhost:3000/admin/dashboard`

### 存档文件
- `存档文件/RULES_全局终极强制规则.md`
- `存档文件/MEMORY_长期核心记忆.md`（本文件）
- `存档文件/2026-05-07_工作进度.md`
