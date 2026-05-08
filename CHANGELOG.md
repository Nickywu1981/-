# CHANGELOG

## [1.0.0] - 2026-05-07

### P0 — 技术底座 (7/7)
- **ModelAdapter 多模型适配层**: 3 个适配器（OpenAI/Claude/SD）+ 降级链 + 健康检查 + 自动注册
- **提示词模板管理**: 4 个模块模板（bgRemoval/copywriting/imageEnhance/videoGen）+ fillPrompt 工具
- **Redis 持久化配置**: RDB + AOF everysec，2GB maxmemory，allkeys-lru 淘汰策略
- **Winston 日志采样**: 100% 错误 / 10% 正常 / 1% 健康检查采样率
- **BullMQ 消息队列**: 4 队列（image/video/batch/notification）+ WebSocket 进度推送集成
- **数据库迁移工具 (umzug)**: 3 个迁移文件 + 4 个 npm 脚本（migrate/down/status/history）
- **express-rate-limit**: 接入 auth/code/global 三层限流

### P1 — 产品运营 (8/8)
- **用量仪表盘增强**: 7 卡片 + 6 图表（ECharts 柱状图/环形图）
- **作品收藏夹**: QuickSaveButton 组件 + 合集管理完整 CRUD + 分享链接
- **积分签到策略**: 7 天阶梯奖励 + 分享奖励 + 邀请奖励 + 幂等防重
- **提示词模板市场**: 6 分类 + 搜索 + 一键使用
- **新手引导 StepWizard**: 3 步向导（选平台 → 上传图片 → 查看结果）
- **Ctrl+K 全局搜索**: CommandPalette 30 工具模糊匹配
- **全站自动 SEO**: usePageSEO composable，100+ 路由映射
- **空状态组件增强**: EmptyState 3 档尺寸 + 示例按钮

### P2 — UI + 智能 (6/6)
- **AI 意图路由 (intentRouter)**: 25 工具关键词加权匹配，9 平台检测，6 动作检测
- **提示词增强器 (promptEnhancer)**: 自动补全风格/光照/构图/质量参数
- **任务进度步骤器**: TaskProgressStepper 组件，步骤可视化 + 百分比
- **图片翻译页面**: 上传图片 → 选择语言 → 预览对比 → 下载结果
- **用户行为埋点**: useAnalytics composable + analyticsService + 5 个数据端点
- **工作台意图联动**: workspace.vue 接入 intentRouter + promptEnhancer

### 基础设施
- 全栈项目: Nuxt3 + Express + MySQL 8.4 + Redis + MinIO
- 69 个前端页面全部 200 OK
- 32 条路由 / 150+ API 端点
- 35 个控制器零内联 SQL
- 108 个服务端测试全部通过
- 品牌色 #7C3AED 统一 + 暗黑模式适配
- Swagger 文档 / PM2 / Docker Compose / CI/CD
- WebSocket 实时任务进度推送

### 修复
- 登录接口 Zod schema 修复（email → username）
- creditService 表名修正（credit_consumption → consumption_record）
- 创建 check_ins 签到表
- LIMIT 参数 prepared statement 兼容性修复
