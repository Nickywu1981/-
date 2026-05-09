# Movio AI — AI 电商视觉创作平台

一站式 AI 电商素材生成 SaaS 平台，覆盖商品图片/视频/文案全流程，支持 13 电商平台尺寸一键适配。

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | Nuxt3 + Vue3 + TypeScript + Element Plus + Vant UI |
| 后端 | Node.js + Express + MySQL 8.4 + Redis + BullMQ |
| AI 模型 | GPT-4o / Claude / Gemini / Stable Diffusion / DALL-E / Runway / Midjourney（7厂商统一代理） |
| 部署 | PM2 + Nginx + Docker Compose |
| 测试 | Vitest + Supertest（22 单元 + 20 集成） |
| 监控 | Winston 结构化日志 + Swagger 2830行 + PM2 Metrics |

## 快速开始

### 环境要求
- Node.js 18+
- MySQL 8.0+
- Redis 6+
- Docker & Docker Compose（可选）

### 一键启动（Docker）

```bash
docker-compose up -d
# 前端 http://localhost:3000
# 后端 http://localhost:3001
# MinIO http://localhost:9001
```

### 手动启动

```bash
# 1. 导入数据库
mysql -u root -p < server/sql/schema.sql
mysql -u root -p < server/sql/seed.sql
mysql -u root -p < server/sql/seed_b2_prompts.sql  # 91个电商提示词模板

# 2. 配置环境变量
cp server/.env.example server/.env
# 编辑 .env 填入数据库密码、JWT密钥、AI模型API-Key等

# 3. 启动后端
cd server && npm install && npm run dev

# 4. 启动前端
cd client && npm install && npm run dev
```

### 运行测试

```bash
cd server
npx vitest run src/__tests__/
```

### 演示账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 普通用户 | demo | demo123 |
| 管理员 | admin | admin123 |

## 功能模块

### 🔵 图片工具（14 项）
智能抠图 · 白底图 · 场景生成 · 商品主图 · 图片精修 · 详情页 H5 · 虚拟试穿 · 一键换色 · 风格迁移 · 幽灵模特 · 去褶皱 · 智能扩图 · 图片翻译 · 文字特效

### 🔵 视频工具（9 项）
图片转视频 · 动作迁移 · 数字人口播 · 带货脚本 · 智能分镜 · 爆款复刻 · 视频编辑 · AI 语音生成 · 声音克隆

### 🔵 批量处理
批量抠图 · 批量场景 · 批量视频 · 批量换色 · WebSocket 实时进度

### 🟢 13 平台尺寸配置（新增）
13 电商平台尺寸规则预置（淘宝/京东/拼多多/抖音/快手/小红书/Shopee/Lazada/Amazon/eBay/Shopify/Wish/TikTok Shop），主图/场景图一键适配

### 🟢 文案生成（新增）
商品标题+关键词一键生成 · 卖点文案智能生成 · 短视频带货脚本（抖音/TikTok/视频号差异化） · 跨境多语言翻译+本地化润色

### 🟢 AI 模型管理（新增）
7 厂商可视化配置（OpenAI/Claude/Gemini/SD/DALL-E/Runway/Midjourney） · Token 用量统计 · 故障自动降级+重试 · 敏感词过滤 · 启动时密钥校验

### 🟢 提示词模板库（新增 — 91 模板 8 分类）
主图生成/场景图/视频脚本/口播脚本/商品文案/种草文案/翻译本地化/创意广告 · 智能推荐引擎（协同过滤） · 收藏分组 · 变量解析 · 使用历史

### 🟢 DIY 页面管理（新增）
双端配置（PC/Mobile） · 完整状态机（草稿→审核→已发布→已下线→已归档） · 版本管理+自动保存+回滚 · 批量发布/下线/归档

### 🟢 拖拽可视化编辑器（新增）
组件拖拽（15+组件库） · Undo/Redo · 30s 自动保存 · PC/Mobile 预览切换 · Ctrl+C/V 复制粘贴 · 网格吸附 · 画布缩放 · 快捷键面板

### 🟢 自定义表单系统（新增）
10 种字段类型 · 3 级校验（前端+Zod+后端） · 5 级数据脱敏 · 字段联动显隐 · 提交数据 CSV 导出

### 🟢 API 统一代理（新增）
第三方 API-Key AES-256-GCM 加密存储 · 域名白名单 · 限流熔断 · 指数退避重试 · 请求日志

### 管理后台
用户管理 · 套餐管理（可自定义免费额度） · 订单管理 · 积分管理 · 内容审核 · 站点配置 · 数据看板 · 提示词管理 · AI 日志 · 模板管理 · 品牌配置 · DIY 页面 · 邮件/短信模板 · 模型配置 · API 代理管理

### 商业化
免费/月卡/季卡/年卡 · 积分消费 · 每日签到 · 分享奖励 · 邀请奖励 · 微信/支付宝沙箱

### 安全体系
JWT 黑名单（登立即失效） · 多租户 tenantPool 数据隔离 · AES-256-GCM 密钥加密 · 6 级分层限流 · CSRF 白名单 · Zod 全路由入参校验 · 文件上传类型+大小白名单

## 项目结构

```
├── client/                       # Nuxt3 前端
│   ├── pages/                    # 页面（工作页 + 管理页 + DIY编辑器 + 对比页）
│   ├── components/               # 共享组件
│   ├── composables/              # useApi/useToast/useDiyEditor/useDiyAutoSave/useDiyComponents
│   ├── layouts/                  # 布局（default/landing/admin/workspace）
│   └── assets/css/               # CSS 变量主题
├── server/                       # Express 后端
│   ├── src/
│   │   ├── controller/           # 控制器（零内联 SQL）
│   │   ├── services/             # Service 层（全部 try-catch 覆盖）
│   │   │   └── adapters/         # 7 厂商 AI 模型适配器
│   │   ├── dao/                  # 数据访问层（全部 tenantPool 多租户隔离）
│   │   ├── route/                # 路由（全部 Zod 校验）
│   │   ├── middleware/           # auth/rateLimiter/asyncHandler/cache/csrf/contentModeration
│   │   ├── utils/                # crypto(AES)/logger/errorCodes
│   │   └── __tests__/            # 22 单元 + 20 集成测试
│   ├── sql/                      # schema + seed + 6 migrations
│   └── .env.example              # 环境变量模板
├── docs/                         # 24 份项目文档（4 分类 + kb + archive）
│   ├── 01_产品需求/               # PRD / 市场分析 / 竞品 / 功能文案
│   ├── 02_技术架构/               # 多模型架构 / 数据库 / API / 配置规范
│   ├── 03_开发进度/               # 创作审计 / 任务清单 / 开发卡片
│   ├── 04_部署与管理/             # 部署手册 / 验收清单 / 编制方案 / UI 规范
│   ├── kb/                       # 知识库索引 + 向量存储
│   └── archive/                  # 旧版 PRD 历史存档
├── docker-compose.yml            # Docker 一键部署
└── CLAUDE.md                     # 开发规则
```

## API 文档

启动后端后访问 `http://localhost:3001/api-docs` 查看 Swagger 文档（2830 行完整定义）。

## 部署

```bash
# 生产构建
cd client && npm run build
cd server && npm run build

# PM2 启动
pm2 start ecosystem.config.js

# Nginx 反向代理
# 参见 nginx.conf 配置示例
```

## 许可证

MIT
