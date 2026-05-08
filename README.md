# Movio AI — AI 电商视觉创作平台

一站式 AI 电商素材生成 SaaS 平台，覆盖商品图片/视频/文案全流程。

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | Nuxt3 + Vue3 + TypeScript + Element Plus + Vant UI |
| 后端 | Node.js + Express + MySQL 8.4 + Redis + BullMQ |
| 部署 | PM2 + Nginx + Docker Compose |
| 测试 | Vitest + Playwright |
| 监控 | Winston + Swagger + PM2 Metrics |

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

# 2. 配置环境变量
cp server/.env.example server/.env
# 编辑 .env 填入数据库密码、JWT密钥等

# 3. 启动后端
cd server && npm install && npm run dev

# 4. 启动前端
cd client && npm install && npm run dev
```

### 演示账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 普通用户 | demo | demo123 |
| 管理员 | admin | admin123 |

## 功能模块

### 图片工具（14 项）
智能抠图 · 白底图 · 场景生成 · 商品主图 · 图片精修 · 详情页 H5 · 虚拟试穿 · 一键换色 · 风格迁移 · 幽灵模特 · 去褶皱 · 智能扩图 · 图片翻译 · 文字特效

### 视频工具（9 项）
图片转视频 · 动作迁移 · 数字人口播 · 带货脚本 · 智能分镜 · 爆款复刻 · 视频编辑 · AI 语音生成 · 声音克隆

### 批量处理
批量抠图 · 批量场景 · 批量视频 · 批量换色 · WebSocket 实时进度

### 管理后台（30 页）
用户管理 · 套餐管理 · 订单管理 · 积分管理 · 内容审核 · 站点配置 · 数据看板 · 提示词管理 · AI 日志 · 模板管理 · 品牌配置 · DIY 页面 · 邮件/短信模板

### AI 模型适配
GPT-4o · Claude · Stable Diffusion XL · 多模型降级链 · 提示词模板库

### 商业化
免费/月卡/季卡/年卡 · 积分消费 · 每日签到 · 分享奖励 · 邀请奖励 · 微信/支付宝沙箱

## 项目结构

```
├── client/                  # Nuxt3 前端
│   ├── pages/               # 69 页面（31 工作页 + 30 管理页 + 8 其他）
│   ├── components/          # 共享组件
│   ├── composables/         # 可组合函数（useApi/useToast/intentRouter/promptEnhancer）
│   ├── layouts/             # 布局（default/landing/admin）
│   └── assets/css/          # CSS 变量主题
├── server/                  # Express 后端
│   ├── src/
│   │   ├── controller/      # 35 控制器（零内联 SQL）
│   │   ├── services/        # 20+ Service 层
│   │   ├── dao/             # 数据访问层
│   │   ├── route/           # 32 条路由（26 条 Zod 校验）
│   │   ├── middleware/      # auth/rateLimiter/asyncHandler/cache
│   │   └── utils/           # 工具函数
│   └── sql/                 # 数据库 schema + seed
├── docker-compose.yml       # Docker 一键部署
├── 存档文件/                 # 项目文档与记忆
└── CLAUDE.md                # 开发规则（19 章）
```

## 开发规范

- **前后端分离**：API 端口 3001，前端端口 3000
- **ES6 模块**：禁止 CommonJS
- **TypeScript**：前端强制 strict 模式
- **CSS 变量**：品牌色 `#7C3AED`，禁止硬编码颜色
- **错误码体系**：`EC_模块_序号` 格式
- **代码审查**：4 维审查 + 7 一票否决项
- **Git**：每次改动立即单独提交

## API 文档

启动后端后访问 `http://localhost:3001/api-docs` 查看 Swagger 文档。

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
