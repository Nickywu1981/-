# Decision 006 — 剪映/CapCut 生态对接 + 多平台分发

- **When**: 2026-05-08 20:24~21:32 CST
- **What**: 两大杀手级功能:
  1. 剪映/CapCut 生态对接 (M05): 视频模板注入、字幕/转场/滤镜自动化
  2. 多平台一键分发 (M06): 13 平台同时发布、批量追踪、失败重试
- **Why**:
  - 竞品分析: 市面上无同时做 AI 视频 + 多平台分发的工具
  - 电商刚需: 抖音/淘宝/Shopee/TikTok/小红书 全覆盖
  - 本方案: "做好一个视频, 全平台一键发" 是核心卖点
- **Context**:
  - M05: advancedVideoService 从 mock sleep() 转为 aiEngine.infer/pipeline
  - M06: 5 个平台适配器 (抖音/淘宝/Shopee/TikTok/小红书) + Base 基类
- **Related commits**: `4aee68c`, `7b28157`, `e6fadc8`
- **Related files**: `server/src/services/adapters/platform/*.js`
