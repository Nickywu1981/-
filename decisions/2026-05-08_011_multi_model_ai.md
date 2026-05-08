# Decision 011 — 多模型 AI 架构

- **When**: 2026-05-08 23:16 CST
- **What**: 构建多模型调度架构:
  - 4 个适配器 (OpenAI GPT-4o / Claude Opus / Gemini / Stability SD)
  - 3 种调度模式: 自动混用 / 自定义混用 / 单模型
  - 评分/排名/聚合算法: 根据任务类型自动选最优模型
- **Why**:
  - 单一模型无法覆盖全部任务 (文本/图片/视频)
  - 自动混用: 系统根据任务类型 (chat/image/video) 自动分配
  - 自定义混用: 高级用户可手动调整执行顺序和优先级
- **Context**:
  - 通过 NewAPI 渠道 (ouoi.me) 接入真实 AI API
  - AI Dispatch 三种模式均返回 200 + 真实响应
  - Embedding 后续通过 OpenAI 适配器新增 (bd7c182)
- **Related commits**: `2752b98`, `0544e14`, `bd7c182`, `efeb351`
- **Related files**: `server/src/services/modelDispatcher.js`, `modelRegistry.js`, `modelRouter.js`
