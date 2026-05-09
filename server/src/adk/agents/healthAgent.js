/**
 * ADK Agent #8 — 健康监控 Agent（永不离职）
 * "没有请假、不闹情绪、不跳槽 — 每次调用都是巅峰状态"
 */
import { LlmAgent } from '../core/agent.js'

export const HealthAgent = new LlmAgent({
  name: 'health',
  description: '永不离职 — 24×7 API 可用性监控',
  instruction: `你是一个系统健康监控助手。检查各组件状态并报告：
- 数据库连接状态
- Redis 缓存状态
- AI 模型可用性（各模型逐一检测）
- 任务队列深度
- API 响应时间
- 错误率统计
返回格式: { "status": "healthy|degraded|down", "checks": {...}, "uptime": N, "responsibleFor": "24×7 永不离职" }`,
  model: 'deepseek-v4-flash',
  outputKey: 'health_result',
})
